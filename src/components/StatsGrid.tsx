interface StatsGridProps {
  total: number;
  current: number;
  elapsedText: string;
  shortStatus: string;
}

export function StatsGrid({ total, current, elapsedText, shortStatus }: StatsGridProps) {
  return (
    <div className="fw-pq-stats" role="status" aria-live="polite">
      <div className="fw-pq-stat"><span>总数</span><b>{total}</b></div>
      <div className="fw-pq-stat"><span>当前</span><b>{current}/{total}</b></div>
      <div className="fw-pq-stat"><span>用时</span><b>{elapsedText}</b></div>
      <div className="fw-pq-stat"><span>状态</span><b>{shortStatus}</b></div>
    </div>
  );
}
