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
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-white">Budget Mode</h3>
        <div className="flex rounded-lg border border-slate-600 overflow-hidden text-sm">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => loadBudget(p)}
              className={`px-3 py-1 capitalize ${period === p ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-300"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(true); setInput(String(budget || "")); }}
          className="ml-auto rounded-lg border border-slate-600 bg-slate-950 px-3 py-1 text-sm text-slate-300"
        >
          Set budget
        </button>
      </div>

      {editing && (
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            min="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter budget amount"
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          />
          <button
            onClick={saveBudget}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400"
          >
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
