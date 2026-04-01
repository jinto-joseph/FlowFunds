import { useAnimatedNumber } from "../hooks/useAnimatedNumber";

export default function SummaryCards({ summary, prediction }) {
  const balance = useAnimatedNumber(summary.balance, 800, 2);
  const income = useAnimatedNumber(summary.total_income, 900, 2);
  const expense = useAnimatedNumber(summary.total_expense, 900, 2);

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card title="Current Balance" value={`₹${balance.toFixed(2)}`} tone="emerald" />
      <Card title="Total Income" value={`₹${income.toFixed(2)}`} tone="cyan" />
      <Card title="Total Expense" value={`₹${expense.toFixed(2)}`} tone="rose" />
      <Card
        title="Money lasts"
        value={prediction.days_left || prediction.days_left === 0 ? `${prediction.days_left} days` : "--"}
        tone="violet"
      />
    </section>
  );
}

function Card({ title, value, tone }) {
  const toneClass = {
    emerald: "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    cyan: "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.12)]",
    rose: "border-rose-400/40 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.12)]",
    violet: "border-violet-400/40 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.12)]"
  }[tone];

  return (
    <article className={`rounded-xl border p-4 backdrop-blur-sm sm:p-5 ${toneClass}`}>
      <p className="text-sm uppercase tracking-wide text-slate-300">{title}</p>
      <p className="mt-1 text-[1.7rem] font-semibold text-white tabular-nums sm:text-2xl">{value}</p>
    </article>
  );
}
