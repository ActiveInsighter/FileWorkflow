import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCompletionSignal } from '../features/queue/completionSignal';
import { getSavedPromptText } from '../features/queue/promptText';
import { getQueueFingerprint, getUrlCommand, parsePrompts } from '../features/queue/parser';
import { RANDOM_WAIT, STORAGE_KEYS } from '../shared/constants';
import { formatDuration, randomInt } from '../shared/format';
import { safeGet, safeJsonGet, safeJsonSet, safeRemove, safeSet } from '../shared/storage';
import { sleep, sleepInterruptible, waitFor } from '../shared/timer';
import type { NavigationRunState, QueueSettings, QueueViewModel, RunnerState } from '../shared/types';
import { setComposerText } from '../services/chatgpt/composer';
import {
  getAssistantCount,
  getLastAssistantText,
  getReplySignature,
  getSendButton,
  isComposerReady,
  isGenerating,
  scrollToBottom
} from '../services/chatgpt/domAdapter';

const initialRunnerState: RunnerState = {
  running: false,
  paused: false,
  pauseRequested: false,
  endRequested: false,
  prompts: [],
  index: 0,
  startedAt: 0,
  finishedAt: 0,
  status: '空闲',
  inputDirty: false,
  waitingUntil: 0,
  currentWaitMinutes: 0,
  completedByEndSignal: false,
  skipUntilUrl: false
};

export function useQueueController() {
  const [promptText, setPromptTextInner] = useState(getSavedPromptText);
  const [runnerState, setRunnerState] = useState<RunnerState>(() => ({
    ...initialRunnerState,
    prompts: parsePrompts(getSavedPromptText())
  }));
  const [settings, setSettingsInner] = useState<QueueSettings>(() => ({
    autoScroll: safeGet(STORAGE_KEYS.autoScroll, 'true') !== 'false',
    randomWait: safeGet(STORAGE_KEYS.randomWait, 'false') === 'true'
  }));
  const [now, setNow] = useState(Date.now());
  const savedFingerprintRef = useRef(getQueueFingerprint(promptText));
  const runnerRef = useRef(runnerState);
  const forceResolveRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    runnerRef.current = runnerState;
  }, [runnerState]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    resumePendingRunIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchRunner = useCallback((patch: Partial<RunnerState>) => {
    runnerRef.current = { ...runnerRef.current, ...patch };
    setRunnerState(runnerRef.current);
  }, []);

  const setPromptText = useCallback((value: string) => {
    setPromptTextInner(value);
    const dirty = getQueueFingerprint(value) !== savedFingerprintRef.current;
    patchRunner({ inputDirty: dirty });
  }, [patchRunner]);

  const setSettings = useCallback((patch: Partial<QueueSettings>) => {
    setSettingsInner(prev => {
      const next = { ...prev, ...patch };
      safeSet(STORAGE_KEYS.autoScroll, next.autoScroll ? 'true' : 'false');
      safeSet(STORAGE_KEYS.randomWait, next.randomWait ? 'true' : 'false');
      return next;
    });
  }, []);

  const applyInputQueue = useCallback((options: { persist?: boolean; silent?: boolean } = {}) => {
    const persist = options.persist ?? true;
    const silent = options.silent ?? false;
    const prompts = parsePrompts(promptText);
    if (persist) safeSet(STORAGE_KEYS.promptText, promptText);
    savedFingerprintRef.current = getQueueFingerprint(promptText);
    patchRunner({
      prompts,
      index: Math.min(runnerRef.current.index, prompts.length),
      inputDirty: false,
      status: silent ? runnerRef.current.status : `已保存队列，当前共 ${prompts.length} 条`
    });
    return prompts;
  }, [patchRunner, promptText]);

  const saveNavigationRunState = useCallback((nextIndex: number) => {
    safeSet(STORAGE_KEYS.promptText, promptText);
    safeJsonSet(STORAGE_KEYS.runState, {
      active: true,
      promptText,
      index: nextIndex,
      startedAt: runnerRef.current.startedAt || Date.now(),
      savedAt: Date.now()
    } satisfies NavigationRunState);
  }, [promptText]);

  const clearNavigationRunState = useCallback(() => safeRemove(STORAGE_KEYS.runState), []);

  const endAndReset = useCallback((status = '已结束') => {
    clearNavigationRunState();
    patchRunner({
      ...initialRunnerState,
      prompts: parsePrompts(promptText),
      status
    });
  }, [clearNavigationRunState, patchRunner, promptText]);

  const sendPrompt = useCallback(async (text: string) => {
    if (runnerRef.current.pauseRequested) throw new Error('已暂停队列');
    if (runnerRef.current.endRequested) throw new Error('已结束队列');

    const baseCount = getAssistantCount();
    const baseText = getLastAssistantText();

    patchRunner({ status: `正在填入第 ${runnerRef.current.index + 1} 条` });
    await waitFor(isComposerReady, {
      timeout: 20000,
      shouldStop: () => runnerRef.current.endRequested,
      stopMessage: '已结束队列'
    });

    setComposerText(text);
    await sleep(650);

    const button = await waitFor(getSendButton, {
      timeout: 20000,
      shouldStop: () => runnerRef.current.pauseRequested || runnerRef.current.endRequested,
      stopMessage: runnerRef.current.endRequested ? '已结束队列' : '已暂停队列'
    });

    patchRunner({ status: `正在发送第 ${runnerRef.current.index + 1} 条` });
    const sentAt = Date.now();
    button.click();
    return { baseCount, baseText, sentAt };
  }, [patchRunner]);

  const waitForReplyDone = useCallback(async (snapshot: { baseCount: number; baseText: string; sentAt: number }) => {
    const start = Date.now();
    while (Date.now() - start < 30000) {
      if (runnerRef.current.endRequested) throw new Error('已结束队列');
      if (getAssistantCount() > snapshot.baseCount || getLastAssistantText() !== snapshot.baseText || isGenerating() || !isComposerReady()) break;
      await sleep(300);
    }

    patchRunner({ status: `等待第 ${runnerRef.current.index + 1} 条完成` });

    let lastSignature = getReplySignature();
    let lastChangeAt = Date.now();
    let controlsIdleSince = 0;
    let cancelled = false;

    const manualDone = new Promise<void>(resolve => {
      forceResolveRef.current = resolve;
    });

    const autoDone = (async () => {
      while (!cancelled && Date.now() - snapshot.sentAt < 600000) {
        if (runnerRef.current.endRequested) throw new Error('已结束队列');
        const signature = getReplySignature();
        const currentTime = Date.now();
        if (signature !== lastSignature) {
          lastSignature = signature;
          lastChangeAt = currentTime;
        }

        const idle = !isGenerating() && (isComposerReady() || Boolean(getSendButton()));
        controlsIdleSince = idle ? (controlsIdleSince || currentTime) : 0;

        const minWaitPassed = currentTime - snapshot.sentAt > 3000;
        const contentStable = currentTime - lastChangeAt >= 2400;
        const controlsStable = controlsIdleSince && currentTime - controlsIdleSince >= 2500;
        const fallbackDone = controlsStable && currentTime - snapshot.sentAt > 9000;

        if ((minWaitPassed && contentStable && controlsStable) || fallbackDone) return;
        await sleep(500);
      }
      if (!cancelled) throw new Error('单条超时');
    })();

    try {
      await Promise.race([autoDone, manualDone]);
    } finally {
      cancelled = true;
      forceResolveRef.current = null;
      autoDone.catch(() => undefined);
    }

    if (settings.autoScroll) {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
      setTimeout(scrollToBottom, 420);
    }
  }, [patchRunner, settings.autoScroll]);

  const runQueue = useCallback(async () => {
    if (runnerRef.current.running) return;
    const prompts = applyInputQueue({ persist: true, silent: true });
    if (!prompts.length) {
      patchRunner({ status: '无可发送的消息' });
      return;
    }

    const startIndex = runnerRef.current.paused ? runnerRef.current.index : 0;
    patchRunner({
      running: true,
      paused: false,
      pauseRequested: false,
      endRequested: false,
      completedByEndSignal: false,
      skipUntilUrl: false,
      waitingUntil: 0,
      currentWaitMinutes: 0,
      index: startIndex,
      startedAt: runnerRef.current.startedAt || Date.now(),
      finishedAt: 0,
      status: startIndex > 0 ? `继续执行 ${startIndex + 1}/${prompts.length}` : '开始执行队列'
    });

    try {
      while (runnerRef.current.index < runnerRef.current.prompts.length) {
        if (runnerRef.current.pauseRequested || runnerRef.current.endRequested) break;

        const currentIndex = runnerRef.current.index;
        const currentPrompt = runnerRef.current.prompts[currentIndex];
        const url = getUrlCommand(currentPrompt);

        if (url) {
          patchRunner({ index: currentIndex + 1, status: `正在替换网页：${url}` });
          saveNavigationRunState(currentIndex + 1);
          await sleep(250);
          window.location.replace(url);
          return;
        }

        if (runnerRef.current.skipUntilUrl) {
          patchRunner({ index: currentIndex + 1, status: `当前任务已完成，跳过普通消息 ${currentIndex + 1}/${runnerRef.current.prompts.length}` });
          await sleep(80);
          continue;
        }

        const snapshot = await sendPrompt(currentPrompt);
        await waitForReplyDone(snapshot);

        patchRunner({ index: currentIndex + 1 });

        if (getLastAssistantText() !== snapshot.baseText && isCompletionSignal(getLastAssistantText())) {
          patchRunner({ completedByEndSignal: true, skipUntilUrl: true, status: '检测到当前任务完成，跳过后续普通消息，等待下一个网页' });
          continue;
        }

        if (settings.randomWait && runnerRef.current.index < runnerRef.current.prompts.length && !runnerRef.current.pauseRequested && !runnerRef.current.endRequested) {
          const minutes = randomInt(RANDOM_WAIT.minMinutes, RANDOM_WAIT.maxMinutes);
          const waitMs = minutes * 60 * 1000;
          patchRunner({ currentWaitMinutes: minutes, waitingUntil: Date.now() + waitMs, status: `随机等待 ${minutes} 分钟后继续` });
          try {
            await sleepInterruptible(waitMs, () => runnerRef.current.pauseRequested || runnerRef.current.endRequested, runnerRef.current.endRequested ? '已结束队列' : '已暂停队列');
          } finally {
            patchRunner({ waitingUntil: 0, currentWaitMinutes: 0 });
          }
        }
      }

      if (runnerRef.current.endRequested) {
        endAndReset('已结束');
        return;
      }

      if (runnerRef.current.pauseRequested) {
        patchRunner({ running: false, paused: true, pauseRequested: false, finishedAt: Date.now(), status: `已暂停 ${runnerRef.current.index}/${runnerRef.current.prompts.length}` });
        return;
      }

      clearNavigationRunState();
      patchRunner({ running: false, paused: false, finishedAt: Date.now(), skipUntilUrl: false, status: runnerRef.current.index >= runnerRef.current.prompts.length ? '完成' : '已停止' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (runnerRef.current.endRequested) {
        endAndReset('已结束');
        return;
      }
      if (runnerRef.current.pauseRequested || message === '已暂停队列') {
        patchRunner({ running: false, paused: true, pauseRequested: false, waitingUntil: 0, currentWaitMinutes: 0, finishedAt: Date.now(), status: `已暂停 ${runnerRef.current.index}/${runnerRef.current.prompts.length}` });
        return;
      }
      patchRunner({ running: false, paused: false, finishedAt: Date.now(), status: `出错：${message}` });
      console.error('[FileWorkflowQueue]', error);
    }
  }, [applyInputQueue, clearNavigationRunState, endAndReset, patchRunner, saveNavigationRunState, sendPrompt, settings.randomWait, waitForReplyDone]);

  const pauseOrEndQueue = useCallback(() => {
    const state = runnerRef.current;
    if (state.paused) {
      endAndReset('已结束');
      return;
    }
    if (state.pauseRequested || state.endRequested) {
      if (forceResolveRef.current) forceResolveRef.current();
      patchRunner({ endRequested: true, pauseRequested: false, status: '正在结束任务...' });
      return;
    }
    if (!state.running) return;
    patchRunner({ pauseRequested: true, status: state.waitingUntil ? '正在暂停：随机等待已取消' : '正在暂停：当前回复完成后停止继续发送' });
  }, [endAndReset, patchRunner]);

  const forceFinish = useCallback(() => {
    forceResolveRef.current?.();
    patchRunner({ status: '已手动结束当前等待' });
  }, [patchRunner]);

  function resumePendingRunIfNeeded() {
    const saved = safeJsonGet<NavigationRunState | null>(STORAGE_KEYS.runState, null);
    if (!saved?.active) return;
    const expired = saved.savedAt && Date.now() - saved.savedAt > 6 * 60 * 60 * 1000;
    if (expired) {
      clearNavigationRunState();
      return;
    }

    setPromptTextInner(saved.promptText);
    const prompts = parsePrompts(saved.promptText);
    savedFingerprintRef.current = getQueueFingerprint(saved.promptText);
    patchRunner({
      prompts,
      index: Math.min(Number(saved.index) || 0, prompts.length),
      startedAt: Number(saved.startedAt) || Date.now(),
      paused: true,
      running: false,
      status: `网页已替换，准备继续 ${Math.min((Number(saved.index) || 0) + 1, prompts.length)}/${prompts.length}`
    });
    clearNavigationRunState();
    window.setTimeout(() => void runQueue(), 1200);
  }

  const view = useMemo<QueueViewModel>(() => {
    const livePrompts = parsePrompts(promptText);
    const total = runnerState.running || runnerState.paused ? runnerState.prompts.length : livePrompts.length;
    const current = runnerState.running || runnerState.paused
      ? Math.min(runnerState.index + (runnerState.running && !runnerState.waitingUntil ? 1 : 0), total)
      : Math.min(runnerState.index, total);
    const elapsed = runnerState.startedAt ? (runnerState.finishedAt || now) - runnerState.startedAt : 0;
    const mode = runnerState.endRequested ? 'ending'
      : runnerState.pauseRequested ? 'pausing'
        : runnerState.waitingUntil ? 'waiting'
          : runnerState.running ? 'running'
            : runnerState.paused ? 'paused'
              : /错|异常|失败|超时/.test(runnerState.status) ? 'error'
                : /完成|完毕/.test(runnerState.status) ? 'done'
                  : 'idle';
    const shortStatus = mode === 'ending' ? '结束'
      : mode === 'pausing' ? '暂停'
        : mode === 'waiting' ? '等待'
          : mode === 'running' ? '运行'
            : mode === 'paused' ? '暂停'
              : mode === 'error' ? '错误'
                : mode === 'done' ? '完成'
                  : /保存/.test(runnerState.status) ? '保存' : '空闲';
    const detail = runnerState.waitingUntil
      ? `随机等待中：剩余 ${formatDuration(Math.max(0, runnerState.waitingUntil - now))}`
      : runnerState.status.length > 42 ? `${runnerState.status.slice(0, 42)}…` : runnerState.status;

    return {
      mode,
      total,
      current,
      lineCount: livePrompts.length,
      elapsedText: formatDuration(elapsed),
      shortStatus,
      detail,
      waitRange: settings.randomWait ? `${RANDOM_WAIT.minMinutes}-${RANDOM_WAIT.maxMinutes} 分钟` : '关闭',
      canStart: !runnerState.running && total > 0,
      canPauseOrEnd: runnerState.running || runnerState.paused,
      canForceFinish: runnerState.running && !runnerState.waitingUntil,
      startLabel: runnerState.paused ? '继续' : '开始',
      pauseEndLabel: runnerState.paused || runnerState.pauseRequested || runnerState.endRequested ? '结束' : '暂停',
      pauseEndDanger: runnerState.paused || runnerState.pauseRequested || runnerState.endRequested
    };
  }, [now, promptText, runnerState, settings.randomWait]);

  return {
    promptText,
    setPromptText,
    runnerState,
    settings,
    setSettings,
    view,
    actions: {
      applyInputQueue,
      runQueue,
      pauseOrEndQueue,
      forceFinish
    }
  };
}
