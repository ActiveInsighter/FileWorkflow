import { useQueueStore } from '../stores/queueStore';

export function ControlButtons() {
  const runner = useQueueStore((state) => state.runner);
  const start = useQueueStore((state) => state.start);
  const pauseOrEnd = useQueueStore((state) => state.pauseOrEnd);
  const saveQueue = useQueueStore((state) => state.saveQueue);

  return (
    <div className="fw-actions">
      <button className="fw-button primary" type="button" disabled={runner.running} onClick={() => start()}>
        {runner.paused ? '继续' : '开始'}
      </button>
      <button className="fw-button" type="button" disabled={!runner.running && !runner.paused} onClick={pauseOrEnd}>
        {runner.paused ? '结束' : '暂停'}
      </button>
      <button className="fw-button" type="button" onClick={() => saveQueue()}>
        保存
      </button>
    </div>
  );
}
