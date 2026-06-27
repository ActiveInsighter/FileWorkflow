import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getQueueFingerprint, getUrlCommand, parseWorkflowText } from '../features/queue/parser';
import {
  ACTIVITY_TERMINAL_STATUSES,
  DEFAULT_QUEUE_TEXT,
  DEFAULT_SETTINGS,
  EVENT_PAUSE_STATUSES,
  EVENT_TERMINAL_STATUSES,
  RANDOM_WAIT,
  STORAGE_KEYS
} from '../shared/constants';
import { formatDuration, randomInt } from '../shared/format';
import { safeGet, safeJsonGet, safeJsonSet, safeRemove, safeSet } from '../shared/storage';
import { sleep, waitFor } from '../shared/timer';
import type { ActivityPlan, NavigationRunState, QueueItem, QueueViewModel, RunnerState, WorkflowStatus } from '../shared/types';
import type { ExtensionSettings } from '../types/settings';
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
import { createWorkflowRepository, type WorkflowRepository } from '../services/backend/taskRepositoryFactory';

const emptyRunnerState: RunnerState = {
  running: false,
  paused: false,
  pauseRequested: false,
  endRequested: false,
  items: [],
  index: 0,
  startedAt: 0,
  finishedAt: 0,
  status: '空闲',
  inputDirty: false,
  waitingUntil: 0,
  currentWaitMinutes: 0,
  taskId: '',
  eventId: '',
  activityIdsByIndex: {},
  currentActivityIndex: -1,
  currentActivityId: ''
};

type RemoteDirective = 'continue' | 'pause' | 'event-finished' | 'activity-finished';

export function useQueueController() {
  const [promptText, setPromptTextInner] = useState(() => safeGet(STORAGE_KEYS.queueText, DEFAULT_QUEUE_TEXT));
  const parsedWorkflow = useMemo(() => parseWorkflowText(promptText), [promptText]);
  const [runnerState, setRunnerState] = useState<RunnerState>(() => ({
    ...emptyRunnerState,
    items: parsedWorkflow.items
  }));
  const [settings, setSettingsInner] = useState<ExtensionSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...safeJsonGet<Partial<ExtensionSettings>>(STORAGE_KEYS.settings, {})
  }));
  const [now, setNow] = useState(Date.now());
  const savedFingerprintRef = useRef(getQueueFingerprint(promptText));
  const runnerRef = useRef(runnerState);
  const repositoryRef = useRef<WorkflowRepository>(createWorkflowRepository(settings));
  const forceResolveRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    runnerRef.current = runnerState;
  }, [runnerState]);

  useEffect(() => {
    repositoryRef.current = createWorkflowRepository(settings);
    safeJsonSet(STORAGE_KEYS.settings, settings);
  }, [settings]);

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

  const setSettings = useCallback((patch: Partial<ExtensionSettings>) => {
    setSettingsInner(prev => ({ ...prev, ...patch }));
  }, []);

  const applyInputQueue = useCallback((options: { persist?: boolean; silent?: boolean } = {}) => {
    const persist = options.persist ?? true;
    const silent = options.silent ?? false;
    const parsed = parseWorkflowText(promptText);
    if (persist) safeSet(STORAGE_KEYS.queueText, promptText);
    savedFingerprintRef.current = getQueueFingerprint(promptText);
    patchRunner({
      items: parsed.items,
      index: Math.min(runnerRef.current.index, parsed.items.length),
      inputDirty: false,
      status: silent ? runnerRef.current.status : `已保存队列：${parsed.items.length} 条，${parsed.activities.length} 个 activity`
    });
    return parsed;
  }, [patchRunner, promptText]);

  const saveNavigationRunState = useCallback((nextIndex: number) => {
    safeSet(STORAGE_KEYS.queueText, promptText);
    safeJsonSet(STORAGE_KEYS.runState, {
      active: true,
      promptText,
      index: nextIndex,
      startedAt: runnerRef.current.startedAt || Date.now(),
      savedAt: Date.now(),
      taskId: runnerRef.current.taskId,
      eventId: runnerRef.current.eventId,
      activityIdsByIndex: runnerRef.current.activityIdsByIndex,
      currentActivityIndex: runnerRef.current.currentActivityIndex,
      currentActivityId: runnerRef.current.currentActivityId
    } satisfies NavigationRunState);
  }, [promptText]);

  const clearNavigationRunState = useCallback(() => safeRemove(STORAGE_KEYS.runState), []);

  const endAndReset = useCallback((status = '已结束') => {
    clearNavigationRunState();
    patchRunner({
      ...emptyRunnerState,
      items: parseWorkflowText(promptText).items,
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

  const checkRemoteDirective = useCallback(async (): Promise<RemoteDirective> => {
    const { eventId, currentActivityId, waitingUntil } = runnerRef.current;
    if (!eventId) return 'continue';

    const repository = repositoryRef.current;
    const eventStatus = normalizeStatus(await repository.getEventStatus(eventId));
    if (eventStatus === 'waiting' && waitingUntil > Date.now()) return 'continue';
    if (isPauseStatus(eventStatus)) return 'pause';
    if (isEventTerminalStatus(eventStatus)) return 'event-finished';

    if (currentActivityId) {
      const activityStatus = normalizeStatus(await repository.getActivityStatus(currentActivityId));
      if (isPauseStatus(activityStatus)) return 'pause';
      if (isActivityTerminalStatus(activityStatus)) return 'activity-finished';
    }

    return 'continue';
  }, []);

  const pauseFromRemote = useCallback((detail: string) => {
    patchRunner({
      running: false,
      paused: true,
      pauseRequested: false,
      waitingUntil: 0,
      currentWaitMinutes: 0,
      finishedAt: Date.now(),
      status: detail
    });
  }, [patchRunner]);

  const skipCurrentActivity = useCallback(async (items: QueueItem[], fromIndex: number) => {
    const currentActivityId = runnerRef.current.currentActivityId;
    if (currentActivityId) await repositoryRef.current.updateActivityStatus(currentActivityId, 'closed', 'activity 状态已结束，跳到下一个链接');
    const nextUrlIndex = items.findIndex((item, index) => index > fromIndex && item.type === 'url');
    const nextIndex = nextUrlIndex >= 0 ? nextUrlIndex : items.length;
    patchRunner({ index: nextIndex, status: nextUrlIndex >= 0 ? `当前 activity 已结束，跳转到第 ${nextUrlIndex + 1} 条链接` : '当前 activity 已结束，后面没有链接' });
  }, [patchRunner]);

  const ensureActivityStarted = useCallback(async (activity: ActivityPlan, url: string) => {
    const current = runnerRef.current;
    let activityId = current.activityIdsByIndex[activity.activityIndex];
    if (!activityId) activityId = createUuid();
    const activityIdsByIndex = { ...current.activityIdsByIndex, [activity.activityIndex]: activityId };
    patchRunner({
      activityIdsByIndex,
      currentActivityIndex: activity.activityIndex,
      currentActivityId: activityId
    });

    await repositoryRef.current.startActivity({
      activityId,
      taskId: current.taskId,
      eventId: current.eventId,
      activity,
      url: url || window.location.href,
      title: document.title || 'ChatGPT',
      site: location.hostname || 'chatgpt.com'
    });
  }, [patchRunner]);

  const runQueue = useCallback(async () => {
    if (runnerRef.current.running) return;
    const parsed = applyInputQueue({ persist: true, silent: true });
    if (parsed.errors.length) {
      patchRunner({ status: `格式错误：${parsed.errors[0]}` });
      return;
    }
    if (!parsed.items.length) {
      patchRunner({ status: '无可发送的消息' });
      return;
    }

    const isResume = runnerRef.current.paused && runnerRef.current.eventId;
    const startIndex = isResume ? runnerRef.current.index : 0;
    const taskId = isResume ? runnerRef.current.taskId : createUuid();
    const eventId = isResume ? runnerRef.current.eventId : createUuid();
    const activityIdsByIndex = isResume ? runnerRef.current.activityIdsByIndex : Object.fromEntries(parsed.activities.map(activity => [activity.activityIndex, createUuid()]));

    patchRunner({
      running: true,
      paused: false,
      pauseRequested: false,
      endRequested: false,
      waitingUntil: 0,
      currentWaitMinutes: 0,
      items: parsed.items,
      index: startIndex,
      startedAt: runnerRef.current.startedAt || Date.now(),
      finishedAt: 0,
      taskId,
      eventId,
      activityIdsByIndex,
      status: startIndex > 0 ? `继续执行 ${startIndex + 1}/${parsed.items.length}` : '开始执行队列'
    });

    await repositoryRef.current.initializeRun({ taskId, eventId, rawInputText: promptText, parsed });
    await repositoryRef.current.updateEventStatus(eventId, 'running', '扩展开始或继续执行事件');

    try {
      while (runnerRef.current.index < runnerRef.current.items.length) {
        if (runnerRef.current.pauseRequested || runnerRef.current.endRequested) break;

        const directive = await checkRemoteDirective();
        if (directive === 'pause') {
          pauseFromRemote('数据库状态为 paused/waiting，已暂停');
          return;
        }
        if (directive === 'event-finished') {
          await repositoryRef.current.finishTask(taskId, eventId, 'succeeded');
          clearNavigationRunState();
          patchRunner({ running: false, paused: false, index: runnerRef.current.items.length, finishedAt: Date.now(), status: '数据库事件状态已结束，队列停止发送' });
          return;
        }
        if (directive === 'activity-finished') {
          await skipCurrentActivity(runnerRef.current.items, runnerRef.current.index);
          continue;
        }

        const currentIndex = runnerRef.current.index;
        const currentItem = runnerRef.current.items[currentIndex];
        if (!currentItem) break;

        if (currentItem.type === 'url') {
          const activity = parsed.activities.find(item => item.activityIndex === currentItem.activityIndex) || makeEmptyActivity(currentItem.activityIndex, currentItem.url);
          await ensureActivityStarted(activity, currentItem.url);
          patchRunner({ index: currentIndex + 1, status: `正在替换网页：${currentItem.url}` });
          saveNavigationRunState(currentIndex + 1);
          await sleep(250);
          window.location.replace(currentItem.url);
          return;
        }

        const activity = parsed.activities.find(item => item.activityIndex === currentItem.activityIndex) || makeEmptyActivity(currentItem.activityIndex, window.location.href);
        if (runnerRef.current.currentActivityIndex !== currentItem.activityIndex) {
          await ensureActivityStarted(activity, activity.url || window.location.href);
        }

        const snapshot = await sendPrompt(currentItem.content);
        await waitForReplyDone(snapshot);
        await repositoryRef.current.updateMessageDone({
          taskId,
          eventId,
          activityId: runnerRef.current.currentActivityId,
          item: currentItem,
          items: runnerRef.current.items
        });

        patchRunner({ index: currentIndex + 1 });

        const afterMessageDirective = await checkRemoteDirective();
        if (afterMessageDirective === 'pause') {
          pauseFromRemote('消息完成后检测到数据库状态为 paused/waiting，已暂停');
          return;
        }
        if (afterMessageDirective === 'event-finished') {
          await repositoryRef.current.finishTask(taskId, eventId, 'succeeded');
          clearNavigationRunState();
          patchRunner({ running: false, paused: false, index: runnerRef.current.items.length, finishedAt: Date.now(), status: '消息完成后检测到事件已结束，队列停止发送' });
          return;
        }
        if (afterMessageDirective === 'activity-finished') {
          await skipCurrentActivity(runnerRef.current.items, currentIndex);
          continue;
        }

        if (settings.randomWait && runnerRef.current.index < runnerRef.current.items.length && !runnerRef.current.pauseRequested && !runnerRef.current.endRequested) {
          const minutes = randomInt(settings.randomWaitMinMinutes || RANDOM_WAIT.minMinutes, settings.randomWaitMaxMinutes || RANDOM_WAIT.maxMinutes);
          const waitMs = minutes * 60 * 1000;
          patchRunner({ currentWaitMinutes: minutes, waitingUntil: Date.now() + waitMs, status: `随机等待 ${minutes} 分钟后继续` });
          await repositoryRef.current.updateEventStatus(eventId, 'waiting', `随机等待 ${minutes} 分钟`);
          const waitDirective = await waitWithStatusPolling(waitMs, checkRemoteDirective);
          patchRunner({ waitingUntil: 0, currentWaitMinutes: 0 });
          if (waitDirective === 'pause') {
            pauseFromRemote('随机等待期间数据库状态变为 paused/waiting，已暂停');
            return;
          }
          if (waitDirective === 'event-finished') {
            await repositoryRef.current.finishTask(taskId, eventId, 'succeeded');
            clearNavigationRunState();
            patchRunner({ running: false, paused: false, index: runnerRef.current.items.length, finishedAt: Date.now(), status: '随机等待期间事件已结束，队列停止发送' });
            return;
          }
          if (waitDirective === 'activity-finished') {
            await skipCurrentActivity(runnerRef.current.items, runnerRef.current.index);
            continue;
          }
          await repositoryRef.current.updateEventStatus(eventId, 'running', '随机等待结束，继续执行');
        }
      }

      if (runnerRef.current.endRequested) {
        await repositoryRef.current.finishTask(taskId, eventId, 'ended');
        endAndReset('已结束');
        return;
      }

      if (runnerRef.current.pauseRequested) {
        await repositoryRef.current.updateEventStatus(eventId, 'paused', '用户手动暂停');
        patchRunner({ running: false, paused: true, pauseRequested: false, finishedAt: Date.now(), status: `已暂停 ${runnerRef.current.index}/${runnerRef.current.items.length}` });
        return;
      }

      clearNavigationRunState();
      await repositoryRef.current.finishTask(taskId, eventId, 'succeeded');
      patchRunner({ running: false, paused: false, finishedAt: Date.now(), status: runnerRef.current.index >= runnerRef.current.items.length ? '完成' : '已停止' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (runnerRef.current.endRequested) {
        await repositoryRef.current.finishTask(taskId, eventId, 'ended');
        endAndReset('已结束');
        return;
      }
      if (runnerRef.current.pauseRequested || message === '已暂停队列') {
        await repositoryRef.current.updateEventStatus(eventId, 'paused', '用户手动暂停');
        patchRunner({ running: false, paused: true, pauseRequested: false, waitingUntil: 0, currentWaitMinutes: 0, finishedAt: Date.now(), status: `已暂停 ${runnerRef.current.index}/${runnerRef.current.items.length}` });
        return;
      }
      await repositoryRef.current.updateEventStatus(eventId, 'failed', message);
      patchRunner({ running: false, paused: false, finishedAt: Date.now(), status: `出错：${message}` });
      console.error('[FileWorkflowQueue]', error);
    }
  }, [applyInputQueue, checkRemoteDirective, clearNavigationRunState, endAndReset, ensureActivityStarted, patchRunner, pauseFromRemote, promptText, saveNavigationRunState, sendPrompt, settings.randomWait, settings.randomWaitMaxMinutes, settings.randomWaitMinMinutes, skipCurrentActivity, waitForReplyDone]);

  const pauseOrEndQueue = useCallback(() => {
    const state = runnerRef.current;
    if (state.paused) {
      void repositoryRef.current.updateEventStatus(state.eventId, 'ended', '用户结束已暂停事件');
      endAndReset('已结束');
      return;
    }
    if (state.pauseRequested || state.endRequested) {
      if (forceResolveRef.current) forceResolveRef.current();
      patchRunner({ endRequested: true, pauseRequested: false, status: '正在结束任务...' });
      void repositoryRef.current.updateEventStatus(state.eventId, 'ended', '用户结束队列');
      return;
    }
    if (!state.running) return;
    patchRunner({ pauseRequested: true, status: state.waitingUntil ? '正在暂停：随机等待已取消' : '正在暂停：当前回复完成后停止继续发送' });
    void repositoryRef.current.updateEventStatus(state.eventId, 'paused', '用户请求暂停');
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
    const parsed = parseWorkflowText(saved.promptText);
    savedFingerprintRef.current = getQueueFingerprint(saved.promptText);
    patchRunner({
      items: parsed.items,
      index: Math.min(Number(saved.index) || 0, parsed.items.length),
      startedAt: Number(saved.startedAt) || Date.now(),
      taskId: saved.taskId,
      eventId: saved.eventId,
      activityIdsByIndex: saved.activityIdsByIndex || {},
      currentActivityIndex: saved.currentActivityIndex ?? -1,
      currentActivityId: saved.currentActivityId || '',
      paused: true,
      running: false,
      status: `网页已替换，准备继续 ${Math.min((Number(saved.index) || 0) + 1, parsed.items.length)}/${parsed.items.length}`
    });
    clearNavigationRunState();
    window.setTimeout(() => void runQueue(), 1200);
  }

  const view = useMemo<QueueViewModel>(() => {
    const liveParsed = parseWorkflowText(promptText);
    const total = runnerState.running || runnerState.paused ? runnerState.items.length : liveParsed.items.length;
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
      : runnerState.status.length > 48 ? `${runnerState.status.slice(0, 48)}…` : runnerState.status;

    return {
      mode,
      total,
      current,
      lineCount: getLogicalLineCount(promptText),
      taskTitle: liveParsed.taskTitle,
      eventTitle: liveParsed.eventTitle,
      messageCount: liveParsed.items.filter(item => item.type === 'message').length,
      activityCount: liveParsed.activities.length,
      elapsedText: formatDuration(elapsed),
      shortStatus,
      detail,
      waitRange: settings.randomWait ? `${settings.randomWaitMinMinutes}-${settings.randomWaitMaxMinutes} 分钟` : '关闭',
      canStart: !runnerState.running && total > 0,
      canPauseOrEnd: runnerState.running || runnerState.paused,
      canForceFinish: runnerState.running && !runnerState.waitingUntil,
      startLabel: runnerState.paused ? '继续' : '开始',
      pauseEndLabel: runnerState.paused || runnerState.pauseRequested || runnerState.endRequested ? '结束' : '暂停',
      pauseEndDanger: runnerState.paused || runnerState.pauseRequested || runnerState.endRequested
    };
  }, [now, promptText, runnerState, settings.randomWait, settings.randomWaitMaxMinutes, settings.randomWaitMinMinutes]);

  return {
    promptText,
    setPromptText,
    parsedWorkflow,
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

async function waitWithStatusPolling(ms: number, checker: () => Promise<RemoteDirective>): Promise<RemoteDirective> {
  const end = Date.now() + Math.max(0, ms || 0);
  while (Date.now() < end) {
    const directive = await checker();
    if (directive !== 'continue') return directive;
    await sleep(Math.min(2000, Math.max(0, end - Date.now())));
  }
  return 'continue';
}

function normalizeStatus(status: string | null): string {
  return String(status || '').trim().toLowerCase();
}

function isPauseStatus(status: string): boolean {
  return EVENT_PAUSE_STATUSES.includes(status as typeof EVENT_PAUSE_STATUSES[number]);
}

function isEventTerminalStatus(status: string): boolean {
  return EVENT_TERMINAL_STATUSES.includes(status as typeof EVENT_TERMINAL_STATUSES[number]);
}

function isActivityTerminalStatus(status: string): boolean {
  return ACTIVITY_TERMINAL_STATUSES.includes(status as typeof ACTIVITY_TERMINAL_STATUSES[number]);
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.random() * 16 | 0;
    const next = char === 'x' ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function makeEmptyActivity(activityIndex: number, url: string): ActivityPlan {
  return { activityIndex, url, messageItems: [] };
}

function getLogicalLineCount(text: string): number {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length;
}
