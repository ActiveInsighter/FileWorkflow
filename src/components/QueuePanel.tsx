import { useState } from 'react';
import { useQueueStore } from '../stores/queueStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ControlButtons } from './ControlButtons';
import { QueueEditor } from './QueueEditor';
import { StatsGrid } from './StatsGrid';
import { Toggle } from './Toggle';

export function QueuePanel() {
  const [collapsed, setCollapsed] = useState(false);
  const prompts = useQueueStore((state) => state.prompts);
  const runner = useQueueStore((state) => state.runner);
  const elapsedText = useQueueStore((state) => state.elapsedText);
  const settings = useSettingsStore();

  const total = prompts.length;
  const current = total === 0 ? '0/0' : `${Math.min(runner.index + 1, total)}/${total}`;

  return (
    <section className={`fw-panel ${collapsed ? 'fw-collapsed' : ''}`} aria-label="FileWorkflow">
      <header className="fw-header">
        <div className="fw-title">
          <span className="fw-dot" />
          <span>Task</span>
        </div>
        <div className="fw-header-actions">
          <button className="fw-icon-button" type="button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? '+' : '−'}
          </button>
        </div>
      </header>

      <div className="fw-body">
        <QueueEditor />
        <ControlButtons />
        <StatsGrid
          total={String(total)}
          current={current}
          elapsed={elapsedText}
          status={runner.running ? '运行中' : runner.paused ? '暂停' : runner.status}
        />
        <div className="fw-options">
          <Toggle checked={settings.autoScroll} label="完成后滚动" onChange={(checked) => settings.patch({ autoScroll: checked })} />
          <Toggle checked={settings.randomWait} label="随机等待" onChange={(checked) => settings.patch({ randomWait: checked })} />
          <span>{settings.randomWaitMinMinutes}-{settings.randomWaitMaxMinutes} 分钟</span>
        </div>
        <footer className="fw-footer">
          <span title={runner.status}>{runner.status}</span>
          <span>Shadow DOM / MV3</span>
        </footer>
      </div>
    </section>
  );
}
