export default function FinancialCoach({ health, onOpenPayback }) {
  const score = Number(health?.health_score ?? 0);
  const tone = score >= 75 ? "emerald" : score >= 45 ? "amber" : "rose";
  const burnRate = health?.burn_rate;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Financial Coach</h3>
          <p className="text-xs text-slate-400">7-day guidance based on your income, expenses, and loans</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${
          tone === "emerald"
            ? "bg-emerald-500/15 text-emerald-300"
            : tone === "amber"
              ? "bg-amber-500/15 text-amber-300"
              : "bg-rose-500/15 text-rose-300"
        }`}>
          Health Score {score.toFixed(0)}/100
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Projected Balance (7d)" value={`₹${Number(health?.projected_balance_7d ?? 0).toFixed(2)}`} tone="cyan" />
        <Metric label="Recommended Daily Budget" value={`₹${Number(health?.recommended_daily_budget ?? 0).toFixed(2)}`} tone="violet" />
        <Metric label="Loan Outstanding" value={`₹${Number(health?.outstanding_loans ?? 0).toFixed(2)}`} tone="amber" />
        <Metric label="Burn Rate" value={burnRate == null ? "N/A" : `${burnRate.toFixed(1)}%`} tone="rose" />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Model logic: projected 7-day = current balance + expected irregular income events - daily expense trend.
        Expected income events: {Number(health?.expected_income_events_7d ?? 0)} in next 7 days.
      </p>

      {health?.expense_spike && (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-200">
          Expense spike detected today. Your spending is unusually high compared with your recent pattern.
        </p>
      )}

      {health?.payback_ready && (
        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-200">
            You now have enough balance to pay back your loan(s):
            <span className="ml-1 font-semibold">₹{Number(health?.suggested_payback_amount ?? 0).toFixed(2)}</span>
          </p>
          <button
            type="button"
            onClick={onOpenPayback}
            className="mt-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-sm text-emerald-100"
          >
            Open Payback Checklist
          </button>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  };

  return (
    <article className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  );
}
