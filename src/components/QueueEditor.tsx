import { useQueueStore } from '../stores/queueStore';

export function QueueEditor() {
  const promptText = useQueueStore((state) => state.promptText);
  const prompts = useQueueStore((state) => state.prompts);
  const setPromptText = useQueueStore((state) => state.setPromptText);

  return (
    <div>
      <label className="fw-label" htmlFor="fileworkflow-queue-editor">
        <b>消息队列</b>
        <span>共 {prompts.length} 行</span>
      </label>
      <textarea
        id="fileworkflow-queue-editor"
        className="fw-editor"
        spellCheck={false}
        value={promptText}
        placeholder={'一行一条消息；多行消息用 --- 分隔；URL 命令写成 <https://...>'}
        onChange={(event) => setPromptText(event.currentTarget.value)}
      />
    </div>
  );
}
