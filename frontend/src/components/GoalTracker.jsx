import { useState } from "react";

export default function GoalTracker({ goals = [], avgDailySavings = 0, onAddGoal, onAddProgress, onDeleteGoal, loading }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [progressId, setProgressId] = useState(null);
  const [progressAmount, setProgressAmount] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const t = Number(target);
    const c = Number(current || 0);
    if (!title.trim() || t <= 0) return;
    await onAddGoal({ title: title.trim(), target_amount: t, current_amount: c, target_date: targetDate || null, note });
    setTitle("");
    setTarget("");
    setCurrent("");
    setTargetDate("");
    setNote("");
    setShowForm(false);
  }

  async function handleProgress(goalId) {
    const amt = Number(progressAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    await onAddProgress(goalId, amt);
    setProgressId(null);
    setProgressAmount("");
  }

  async function confirmDelete() {
    if (!deleteConfirmId || !onDeleteGoal) return;
    try {
      await onDeleteGoal(deleteConfirmId);
    } catch { /* handled by parent */ }
    setDeleteConfirmId(null);
  }

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-medium mb-4">Delete this savings goal?</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button type="button" onClick={confirmDelete} className="btn btn-danger btn-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">
            <span>🎯</span> Savings Goals
          </h3>
          {avgDailySavings !== 0 && (
            <p className="section-subtitle">
              Avg daily savings: <span className={avgDailySavings > 0 ? "text-emerald-400" : "text-rose-400"}>₹{avgDailySavings.toFixed(2)}</span>
            </p>
          )}
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-xs">
          {showForm ? "Cancel" : "+ New Goal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-2 grid-cols-1 sm:grid-cols-2 mb-4 animate-scale-in">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Goal title (e.g. New Laptop)" required />
          <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} className="input" placeholder="Target amount (₹)" required />
          <input type="number" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" placeholder="Already saved (₹)" />
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input" />
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input sm:col-span-2" placeholder="Note (optional)" />
          <button type="submit" disabled={loading} className="btn btn-success sm:col-span-2">Create Goal</button>
        </form>
      )}

      {goals.length === 0 ? (
        <p className="text-center py-6 text-sm text-slate-500">
          <span className="text-3xl block mb-1">🎯</span>
          No savings goals yet. Set one above!
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const percent = Math.min(100, goal.progress || 0);
            const barColor = goal.is_completed
              ? "bg-emerald-500"
              : percent >= 75
                ? "bg-cyan-500"
                : percent >= 50
                  ? "bg-amber-500"
                  : "bg-violet-500";

            return (
              <div
                key={goal.id}
                className={`rounded-xl border p-4 transition-all ${
                  goal.is_completed
                    ? "border-emerald-500/20 bg-emerald-950/10"
                    : "border-slate-700/30 bg-slate-900/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold text-sm ${goal.is_completed ? "text-emerald-300" : "text-white"}`}>
                        {goal.is_completed && "✅ "}{goal.title}
                      </h4>
                    </div>
                    {goal.note && <p className="text-xs text-slate-400 truncate mt-0.5">{goal.note}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!goal.is_completed && (
                      <button
                        type="button"
                        onClick={() => setProgressId(progressId === goal.id ? null : goal.id)}
                        className="btn btn-primary btn-xs"
                      >
                        + Add
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(goal.id)}
                      className="btn btn-danger btn-xs"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    ₹{goal.current_amount.toFixed(0)} / ₹{goal.target_amount.toFixed(0)}
                    <span className="text-slate-500 ml-1">({percent.toFixed(0)}%)</span>
                  </span>
                  <div className="flex gap-3 text-slate-400">
                    {goal.target_date && <span>Target: {goal.target_date}</span>}
                    {goal.eta_days != null && !goal.is_completed && (
                      <span className="text-cyan-400">~{goal.eta_days}d to go</span>
                    )}
                  </div>
                </div>

                {/* Add Progress Form */}
                {progressId === goal.id && (
                  <div className="flex gap-2 mt-3 animate-scale-in">
                    <input
                      type="number"
                      step="0.01"
                      value={progressAmount}
                      onChange={(e) => setProgressAmount(e.target.value)}
                      className="input flex-1"
                      placeholder="Amount to add"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleProgress(goal.id)}
                      disabled={loading}
                      className="btn btn-success btn-sm"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
