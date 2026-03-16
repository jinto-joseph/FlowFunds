import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#22c55e", "#06b6d4", "#a855f7", "#f43f5e", "#f59e0b", "#8b5cf6"];

function PeriodCard({ title, data }) {
  const categories = data?.categories ?? [];

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Mini title="Income" value={`₹${Number(data?.income ?? 0).toFixed(2)}`} tone="emerald" />
        <Mini title="Expense" value={`₹${Number(data?.expense ?? 0).toFixed(2)}`} tone="rose" />
        <Mini title="Net" value={`₹${Number(data?.net ?? 0).toFixed(2)}`} tone={(data?.net ?? 0) >= 0 ? "cyan" : "amber"} />
      </div>

      {data?.top_category && (
        <p className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-200">
          Top spending section: <strong>{data.top_category.category}</strong> (₹{Number(data.top_category.amount).toFixed(2)})
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categories} dataKey="amount" nameKey="category" outerRadius={90} label>
                {categories.map((entry, i) => (
                  <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {categories.length === 0 && <p className="text-sm text-slate-400">No expense categories yet.</p>}
          {categories.map((c) => (
            <div key={c.category} className="rounded-lg bg-slate-950 px-3 py-2 text-sm">
              <div className="flex justify-between text-slate-200">
                <span>{c.category}</span>
                <span>₹{Number(c.amount).toFixed(2)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-700">
                <div className="h-1.5 rounded-full bg-cyan-400" style={{ width: `${Math.min(c.percent, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.daily ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => String(v).slice(5)} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function Mini({ title, value, tone }) {
  const style = {
    emerald: "border-emerald-500/30 bg-emerald-500/10",
    rose: "border-rose-500/30 bg-rose-500/10",
    cyan: "border-cyan-500/30 bg-cyan-500/10",
    amber: "border-amber-500/30 bg-amber-500/10",
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${style}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

export default function InsightsPage({ weekly, monthly }) {
  return (
    <section className="space-y-4">
      <PeriodCard title="Weekly Analysis" data={weekly} />
      <PeriodCard title="Monthly Analysis" data={monthly} />
    </section>
  );
}
