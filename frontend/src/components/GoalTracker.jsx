import { useState } from "react";

export default function GoalTracker({ goals = [], avgDailySavings = 0, onAddGoal, onAddProgress, loading }) {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [note, setNote] = useState("");

  async function submit(event) {
    event.preventDefault();
    const target = Number(targetAmount);
    const current = Number(currentAmount || 0);
    if (!title.trim() || !Number.isFinite(target) || target <= 0 || current < 0) return;
    await onAddGoal({
      title: title.trim(),
      target_amount: target,
      current_amount: current,
      target_date: targetDate || null,
      note,
    });
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setNote("");
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Savings Goals + ETA</h3>
        <p className="text-xs text-slate-400">Avg daily savings: ₹{Number(avgDailySavings).toFixed(2)}</p>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title" className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" required />
        <input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Target amount" className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" required />
        <input value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="Current saved" className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        <button type="submit" disabled={loading} className="rounded-lg bg-violet-500/90 px-3 py-2 font-medium text-white hover:bg-violet-400 disabled:opacity-60">Add Goal</button>
      </form>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />

      <ul className="mt-3 space-y-2">
        {goals.length === 0 && <li className="text-sm text-slate-400">No goals yet.</li>}
        {goals.map((goal) => (
          <li key={goal.id} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-white">{goal.title}</p>
              <p className="text-xs text-slate-400">{goal.progress.toFixed(1)}%</p>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, Number(goal.progress || 0))}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              ₹{Number(goal.current_amount).toFixed(2)} / ₹{Number(goal.target_amount).toFixed(2)} · Remaining ₹{Number(goal.remaining_amount).toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">
              {goal.eta_days == null ? "ETA unavailable (save more consistently)" : `Predicted ETA: ${goal.eta_days} days (${goal.projected_date})`}
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => onAddProgress(goal.id, 100)} className="rounded-md border border-violet-500/50 bg-violet-500/10 px-2 py-1 text-xs text-violet-200">+₹100</button>
              <button type="button" onClick={() => onAddProgress(goal.id, 500)} className="rounded-md border border-violet-500/50 bg-violet-500/10 px-2 py-1 text-xs text-violet-200">+₹500</button>
              <button type="button" onClick={() => onAddProgress(goal.id, 1000)} className="rounded-md border border-violet-500/50 bg-violet-500/10 px-2 py-1 text-xs text-violet-200">+₹1000</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
