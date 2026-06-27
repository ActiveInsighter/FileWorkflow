import { useMemo, useRef, useState } from 'react';
import { useQueueController } from '../hooks/useQueueController';

export function ContentApp() {
  const [collapsed, setCollapsed] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const controller = useQueueController();
  const errors = controller.parsedWorkflow.errors;
  const canUseSupabase = controller.settings.supabaseEnabled && controller.settings.supabaseUrl && controller.settings.supabaseAnonKey;
  const ids = useMemo(() => ({
    taskId: controller.runnerState.taskId || '未创建',
    eventId: controller.runnerState.eventId || '未创建',
    activityId: controller.runnerState.currentActivityId || '未创建'
  }), [controller.runnerState.activityIdsByIndex, controller.runnerState.currentActivityId, controller.runnerState.eventId, controller.runnerState.taskId]);

  return (
    <section className={`fw-panel ${collapsed ? 'fw-collapsed' : ''}`} aria-label="FileWorkflow">
      <header className="fw-header">
        <div className="fw-title">
          <span className={`fw-dot fw-dot-${controller.view.mode}`} />
          <span>FileWorkflow</span>
        </div>
        <div className="fw-header-actions">
          <button className="fw-icon-button" type="button" onClick={() => setCollapsed(value => !value)}>
            {collapsed ? '+' : '−'}
          </button>
        </div>
      </header>

      <div className="fw-body">
        <label className="fw-label" htmlFor="fileworkflow-queue-editor">
          <b>消息队列</b>
          <span>第 1 行 task，第 2 行 event，链接用 &lt;https://...&gt;，轮询用 {'{消息}*次数'}</span>
        </label>

        <div className="fw-editor-wrap">
          <pre className="fw-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: controller.parsedWorkflow.highlightedHtml }} />
          <textarea
            ref={editorRef}
            id="fileworkflow-queue-editor"
            className="fw-editor"
            spellCheck={false}
            value={controller.promptText}
            placeholder="[task: 任务名称]\n[event: 事件名称]\n<https://chatgpt.com/>\n{继续总结}*10"
            onChange={event => controller.setPromptText(event.currentTarget.value)}
            onScroll={event => {
              const highlighter = event.currentTarget.previousElementSibling as HTMLElement | null;
              if (!highlighter) return;
              highlighter.scrollTop = event.currentTarget.scrollTop;
              highlighter.scrollLeft = event.currentTarget.scrollLeft;
            }}
          />
        </div>

        {errors.length > 0 ? (
          <div className="fw-errors">
            {errors.slice(0, 3).map(error => <div key={error}>⚠ {error}</div>)}
          </div>
        ) : (
          <div className="fw-valid">格式正确：任务、事件、链接和轮询块已识别</div>
        )}

        <div className="fw-actions">
          <button className="fw-button primary" type="button" disabled={!controller.view.canStart || errors.length > 0} onClick={() => void controller.actions.runQueue()}>
            {controller.view.startLabel}
          </button>
          <button className={`fw-button ${controller.view.pauseEndDanger ? 'danger' : ''}`} type="button" disabled={!controller.view.canPauseOrEnd} onClick={() => controller.actions.pauseOrEndQueue()}>
            {controller.view.pauseEndLabel}
          </button>
          <button className="fw-button" type="button" disabled={!controller.view.canForceFinish} onClick={() => controller.actions.forceFinish()}>
            手动完成当前等待
          </button>
          <button className="fw-button" type="button" onClick={() => controller.actions.applyInputQueue()}>
            保存解析
          </button>
        </div>

        <div className="fw-stats">
          <Stat label="总项" value={`${controller.view.current}/${controller.view.total}`} />
          <Stat label="消息" value={String(controller.view.messageCount)} />
          <Stat label="Activity" value={String(controller.view.activityCount)} />
          <Stat label="用时" value={controller.view.elapsedText} />
          <Stat label="状态" value={controller.view.shortStatus} />
          <Stat label="等待" value={controller.view.waitRange} />
        </div>

        <div className="fw-meta">
          <div><b>Task</b><span>{controller.view.taskTitle || '未识别'}</span></div>
          <div><b>Event</b><span>{controller.view.eventTitle || '未识别'}</span></div>
          <div><b>Task ID</b><span title={ids.taskId}>{ids.taskId}</span></div>
          <div><b>Event ID</b><span title={ids.eventId}>{ids.eventId}</span></div>
          <div><b>Activity ID</b><span title={ids.activityId}>{ids.activityId}</span></div>
        </div>

        <details className="fw-settings">
          <summary>运行设置 / Supabase</summary>
          <label className="fw-check">
            <input type="checkbox" checked={controller.settings.autoScroll} onChange={event => controller.setSettings({ autoScroll: event.currentTarget.checked })} />
            回复完成后自动滚动到底部
          </label>
          <label className="fw-check">
            <input type="checkbox" checked={controller.settings.randomWait} onChange={event => controller.setSettings({ randomWait: event.currentTarget.checked })} />
            每条消息后随机等待
          </label>
          <div className="fw-setting-row">
            <label>最小等待<input type="number" min={1} value={controller.settings.randomWaitMinMinutes} onChange={event => controller.setSettings({ randomWaitMinMinutes: Number(event.currentTarget.value) || 1 })} /></label>
            <label>最大等待<input type="number" min={1} value={controller.settings.randomWaitMaxMinutes} onChange={event => controller.setSettings({ randomWaitMaxMinutes: Number(event.currentTarget.value) || 1 })} /></label>
          </div>
          <label className="fw-check">
            <input type="checkbox" checked={controller.settings.supabaseEnabled} onChange={event => controller.setSettings({ supabaseEnabled: event.currentTarget.checked })} />
            启用 Supabase 状态同步和轮询
          </label>
          <label className="fw-input-label">Project URL<input value={controller.settings.supabaseUrl} onChange={event => controller.setSettings({ supabaseUrl: event.currentTarget.value })} /></label>
          <label className="fw-input-label">Anon / publishable key<input value={controller.settings.supabaseAnonKey} onChange={event => controller.setSettings({ supabaseAnonKey: event.currentTarget.value })} placeholder="只填公开 anon key，不要填 service role key" /></label>
          <div className={canUseSupabase ? 'fw-valid' : 'fw-hint'}>{canUseSupabase ? 'Supabase 已启用：每条消息结束后会读取 event/activity 状态字段' : '未启用 Supabase：使用本地状态模拟运行'}</div>
        </details>

        <footer className="fw-footer">
          <span title={controller.view.detail}>{controller.view.detail}</span>
          <span>Shadow DOM / MV3</span>
        </footer>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="fw-stat">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}
