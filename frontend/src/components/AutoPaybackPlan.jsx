export default function AutoPaybackPlan({ plan, onOpenPayback }) {
  const items = plan?.plan ?? [];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Auto Payback Plan</h3>
          <p className="text-xs text-slate-400">Daily repayment targets by due date</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Outstanding</p>
          <p className="text-lg font-bold text-amber-300">₹{Number(plan?.outstanding_total ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {Number(plan?.outstanding_total ?? 0) <= 0 ? (
        <p className="text-sm text-emerald-300">No pending loans. You are clear.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="Daily Target" value={`₹${Number(plan?.recommended_daily_target ?? 0).toFixed(2)}`} tone="amber" />
            <Metric label="Affordable Daily" value={`₹${Number(plan?.affordable_daily_target ?? 0).toFixed(2)}`} tone="cyan" />
            <Metric label="Lump Sum Now" value={`₹${Number(plan?.suggested_lump_sum ?? 0).toFixed(2)}`} tone="emerald" />
          </div>

          {plan?.can_clear_now && (
            <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
              <p className="text-sm text-emerald-200">You can close all pending loans now.</p>
              <button
                type="button"
                onClick={onOpenPayback}
                className="mt-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-sm text-emerald-100"
              >
                Open Payback Checklist
              </button>
            </div>
          )}

          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-white">
                    {item.person} · <span className="text-amber-300">₹{Number(item.amount).toFixed(2)}</span>
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    item.risk === "high"
                      ? "bg-rose-500/20 text-rose-300"
                      : item.risk === "medium"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {item.days_left} days left
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Due {item.due_date} · Daily target ₹{Number(item.daily_target).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  };

  return (
    <article className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  );
}
