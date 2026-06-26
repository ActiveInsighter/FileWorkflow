import { useRef, useState } from 'react';
import { PANEL_ID, STORAGE_KEYS } from '../shared/constants';
import { safeGet, safeSet } from '../shared/storage';
import { usePanelPosition } from '../hooks/usePanelPosition';
import { useQueueController } from '../hooks/useQueueController';
import { PromptEditor } from './PromptEditor';
import { StatsGrid } from './StatsGrid';
import { Toggle } from './Toggle';

export function FloatingPanel() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(() => safeGet(STORAGE_KEYS.collapsed, 'false') === 'true');
  const queue = useQueueController();
  const { clampCurrentPanel } = usePanelPosition(panelRef, headerRef);

  const applyCollapsed = (next: boolean) => {
    setCollapsed(next);
    safeSet(STORAGE_KEYS.collapsed, next ? 'true' : 'false');
    requestAnimationFrame(() => clampCurrentPanel(true));
  };

  return (
    <div
      ref={panelRef}
      id={PANEL_ID}
      data-running={queue.runnerState.running ? 'true' : 'false'}
      data-mode={queue.view.mode}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div ref={headerRef} className="fw-pq-header" aria-label="拖动面板">
        <div className="fw-pq-title">
          <span className="fw-pq-dot" aria-hidden="true" />
          <span>Task</span>
        </div>
        <span className="fw-pq-badge" data-mode={queue.view.mode}>{badgeText(queue.view.mode)}</span>
        <button
          className="fw-pq-collapse"
          type="button"
          aria-label={collapsed ? '展开面板' : '折叠面板'}
          onClick={() => applyCollapsed(!collapsed)}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>

      <div className="fw-pq-body">
        <PromptEditor
          value={queue.promptText}
          lineCount={queue.view.lineCount}
          onChange={queue.setPromptText}
        />

        <div className="fw-pq-actions">
          <button
            className="fw-pq-button primary"
            type="button"
            disabled={!queue.view.canStart}
            onClick={() => void queue.actions.runQueue()}
          >
            {queue.view.startLabel}
          </button>
          <button
            className={`fw-pq-button ${queue.view.pauseEndDanger ? 'danger' : ''}`}
            type="button"
            disabled={!queue.view.canPauseOrEnd}
            onClick={queue.actions.pauseOrEndQueue}
          >
            {queue.view.pauseEndLabel}
          </button>
          <button
            className="fw-pq-button"
            type="button"
            disabled={!queue.runnerState.inputDirty}
            onClick={() => queue.actions.applyInputQueue({ persist: true, silent: false })}
          >
            {queue.runnerState.inputDirty ? '保存' : '已保存'}
          </button>
        </div>

        <StatsGrid
          total={queue.view.total}
          current={queue.view.current}
          elapsedText={queue.view.elapsedText}
          shortStatus={queue.view.shortStatus}
        />

        <div className="fw-pq-options">
          <Toggle
            checked={queue.settings.autoScroll}
            label="完成后滚动"
            onChange={checked => queue.setSettings({ autoScroll: checked })}
          />
          <Toggle
            checked={queue.settings.randomWait}
            label="随机等待"
            onChange={checked => queue.setSettings({ randomWait: checked })}
          />
          <span className="fw-pq-wait-range">{queue.view.waitRange}</span>
        </div>

        <div className="fw-pq-footer">
          <span className="fw-pq-detail" title={queue.runnerState.status}>{queue.view.detail}</span>
          <button
            className="fw-pq-force"
            type="button"
            hidden={!queue.view.canForceFinish}
            onClick={queue.actions.forceFinish}
          >
            手动完成当前等待
          </button>
        </div>
      </div>
    </div>
  );
}

function badgeText(mode: string): string {
  const map: Record<string, string> = {
    ending: '结束中',
    pausing: '暂停中',
    waiting: '等待中',
    running: '运行中',
    paused: '已暂停',
    error: '错误',
    done: '完成',
    idle: '空闲'
  };
  return map[mode] || '空闲';
}
