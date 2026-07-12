import { useState } from "react";

const PERIODS = ["weekly", "monthly"];

export default function BudgetPanel({ summary }) {
  const [period, setPeriod] = useState("weekly");
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem(`flowfunds-budget-${period}`);
    return saved ? Number(saved) : "";
  });
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  function loadBudget(p) {
    const saved = localStorage.getItem(`flowfunds-budget-${p}`);
    setBudget(saved ? Number(saved) : "");
    setPeriod(p);
  }

  function saveBudget() {
    const val = Number(input);
    if (!val || val <= 0) return;
    localStorage.setItem(`flowfunds-budget-${period}`, String(val));
    setBudget(val);
    setEditing(false);
    setInput("");
  }

  // Approximate spend for period from total expense (rough; real app would use date range)
  const spent = summary.total_expense;
  const remaining = budget ? Math.max(budget - spent, 0) : null;
  const pct = budget ? Math.min((spent / budget) * 100, 100) : 0;

  const barColor = pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="section-title"><span>💳</span> Budget Mode</h3>
        <div className="flex rounded-lg border border-slate-700/50 overflow-hidden text-sm ml-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => loadBudget(p)}
              className={`px-3 py-1.5 capitalize transition-all ${period === p ? "bg-violet-500/25 text-violet-200 border-violet-500/30" : "bg-slate-900/50 text-slate-400 hover:text-slate-200"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(true); setInput(String(budget || "")); }}
          className="btn btn-ghost btn-xs"
        >
          Set budget
        </button>
      </div>

      {editing && (
        <div className="mb-3 flex gap-2 animate-scale-in">
          <input
            type="number"
            min="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter budget amount"
            className="input flex-1"
          />
          <button onClick={saveBudget} className="btn btn-primary btn-sm">
            Save
          </button>
        </div>
      )}

      {budget ? (
        <>
          <div className="mb-2 flex justify-between text-sm text-slate-300">
            <span>Spent: ₹{spent.toFixed(0)}</span>
            <span>Budget: ₹{budget.toFixed(0)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {remaining != null && remaining > 0
              ? `₹${remaining.toFixed(0)} remaining`
              : <span className="text-rose-300 font-medium">Budget exceeded by ₹{(spent - budget).toFixed(0)}</span>}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-400">Set a {period} budget to track your progress.</p>
      )}
    </div>
  );
}
