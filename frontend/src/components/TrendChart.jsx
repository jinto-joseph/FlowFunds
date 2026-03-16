import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function TrendChart({ data }) {
  const formatted = data.map((d) => ({
    ...d,
    day: d.day.slice(5) // "2026-03-15" → "03-15"
  }));

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Daily Spending (last 30 days)</h3>
      {formatted.length === 0 ? (
        <p className="text-sm text-slate-400">No expense data yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
