export default function TodaySnapshot({ stats }) {
  const today = Number(stats?.today ?? 0);
  const yesterday = Number(stats?.yesterday ?? 0);
  const weekAvg = Number(stats?.week_avg ?? 0);
  const weekTotal = Number(stats?.week_total ?? 0);

  const delta = today - yesterday;
  const deltaLabel = delta >= 0 ? `+₹${delta.toFixed(2)}` : `-₹${Math.abs(delta).toFixed(2)}`;
  const deltaColor = delta >= 0 ? "text-rose-300" : "text-emerald-300";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Today Snapshot</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Mini title="Today" value={`₹${today.toFixed(2)}`} tone="rose" />
        <Mini title="Yesterday" value={`₹${yesterday.toFixed(2)}`} tone="cyan" />
        <Mini title="7-day Avg" value={`₹${weekAvg.toFixed(2)}`} tone="violet" />
        <Mini title="7-day Total" value={`₹${weekTotal.toFixed(2)}`} tone="emerald" />
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Change vs yesterday: <span className={`font-semibold ${deltaColor}`}>{deltaLabel}</span>
      </p>
    </div>
  );
}

function Mini({ title, value, tone }) {
  const style = {
    rose: "border-rose-500/30 bg-rose-500/10",
    cyan: "border-cyan-500/30 bg-cyan-500/10",
    violet: "border-violet-500/30 bg-violet-500/10",
    emerald: "border-emerald-500/30 bg-emerald-500/10",
  }[tone];

  return (
    <div className={`rounded-lg border p-3 ${style}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-xl font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}
