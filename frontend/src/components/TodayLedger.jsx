export default function TodayLedger({ ledger }) {
  const income = Number(ledger?.today_income ?? 0);
  const expense = Number(ledger?.today_expense ?? 0);
  const net = Number(ledger?.today_net ?? 0);
  const rows = ledger?.transactions ?? [];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Today Income vs Expense</h3>
          <p className="text-xs text-slate-400">Daily basis summary with today's transactions</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Mini title="Today Income" value={`₹${income.toFixed(2)}`} tone="emerald" />
        <Mini title="Today Expense" value={`₹${expense.toFixed(2)}`} tone="rose" />
        <Mini title="Today Net" value={`₹${net.toFixed(2)}`} tone={net >= 0 ? "cyan" : "amber"} />
      </div>

      <ul className="mt-3 space-y-2">
        {rows.length === 0 && <li className="text-sm text-slate-400">No transactions recorded today.</li>}
        {rows.slice(0, 8).map((tx) => (
          <li key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
            <div>
              <p className="text-sm text-white">{tx.kind === "income" ? tx.source || "Income" : tx.category || "Expense"}</p>
              <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <p className={`font-semibold ${tx.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
              {tx.kind === "income" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mini({ title, value, tone }) {
  const tones = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };

  return (
    <article className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-xs opacity-80">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  );
}