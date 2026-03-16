import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function MLForecastChart({ historical = [], forecast = [], trend }) {
  const hist = historical.map((h) => ({ day: h.day.slice(5), actual: h.actual }));
  const pred = forecast.map((f) => ({
    day: f.day.slice(5),
    predicted: f.predicted,
    lower: f.lower,
    upper: f.upper,
  }));

  const data = [...hist, ...pred];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">ML Spending Forecast (7 days)</h3>
        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
              trend === "increasing"
                ? "bg-rose-500/20 text-rose-300"
                : trend === "decreasing"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-cyan-500/20 text-cyan-300"
            }`}
          >
            trend: {trend}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Add at least 3 daily expense entries for forecast.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              <Legend />

              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 2 }}
              />

              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 2 }}
              />

              <Area
                type="monotone"
                dataKey="upper"
                name="Upper range"
                stroke="none"
                fill="#a78bfa"
                fillOpacity={0.12}
              />
              <Area
                type="monotone"
                dataKey="lower"
                name="Lower range"
                stroke="none"
                fill="#0f172a"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
