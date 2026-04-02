import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function Mini({ label, value, tone }) {
  const tones = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function CashflowAnalytics({
  data,
  filters,
  onChangeFilters,
  loading,
}) {
  const rows = data?.series ?? [];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Income vs Expense Analytics</h3>
          <p className="text-sm text-slate-300">Choose daily, weekly, or monthly with custom date range.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm text-slate-300">
          Group by
          <select
            value={filters.groupBy}
            onChange={(e) => onChangeFilters((prev) => ({ ...prev, groupBy: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Start date
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChangeFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm text-slate-300">
          End date
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onChangeFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 90);
            const toIso = (d) => d.toISOString().slice(0, 10);
            onChangeFilters({ groupBy: "month", startDate: toIso(start), endDate: toIso(end) });
          }}
          className="h-[42px] self-end rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        >
          Last 90 days
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Mini label="Total Income" value={`Rs ${Number(data?.total_income ?? 0).toFixed(2)}`} tone="emerald" />
        <Mini label="Total Expense" value={`Rs ${Number(data?.total_expense ?? 0).toFixed(2)}`} tone="rose" />
        <Mini label="Net" value={`Rs ${Number(data?.net ?? 0).toFixed(2)}`} tone="cyan" />
      </div>

      <div className="mt-4 h-72">
        {loading ? (
          <p className="text-sm text-slate-400">Loading analytics...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions for selected range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
