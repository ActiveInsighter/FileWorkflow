interface StatsGridProps {
  total: string;
  current: string;
  elapsed: string;
  status: string;
}

export function StatsGrid(props: StatsGridProps) {
  return (
    <div className="fw-stats">
      <Stat label="总数" value={props.total} />
      <Stat label="当前" value={props.current} />
      <Stat label="用时" value={props.elapsed} />
      <Stat label="状态" value={props.status} />
    </div>
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
