import { useState } from "react";

export default function RecurringBills({ bills = [], reminders = [], onAddBill, onMarkPaid, onToggleActive, onDeleteBill, loading }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDue, setNextDue] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!name.trim() || numAmt <= 0) return;
    await onAddBill({ name: name.trim(), amount: numAmt, frequency, next_due_date: nextDue || undefined, note });
    setName("");
    setAmount("");
    setNote("");
    setNextDue("");
    setShowForm(false);
  }

  async function confirmDelete() {
    if (!deleteConfirmId || !onDeleteBill) return;
    try {
      await onDeleteBill(deleteConfirmId);
    } catch { /* handled by parent */ }
    setDeleteConfirmId(null);
  }

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-medium mb-4">Delete this recurring bill?</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button type="button" onClick={confirmDelete} className="btn btn-danger btn-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">
          <span>📅</span> Recurring Bills
        </h3>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-xs">
          {showForm ? "Cancel" : "+ Add Bill"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-2 grid-cols-1 sm:grid-cols-2 mb-4 animate-scale-in">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Bill name" required />
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Amount" required />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
          <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="input" />
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input sm:col-span-2" placeholder="Note (optional)" />
          <button type="submit" disabled={loading} className="btn btn-success sm:col-span-2">Add Bill</button>
        </form>
      )}

      {bills.length === 0 ? (
        <p className="text-center py-4 text-sm text-slate-500">
          <span className="text-2xl block mb-1">📋</span>
          No recurring bills. Add one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {bills.map((bill) => (
            <li
              key={bill.id}
              className={`rounded-xl border p-3 transition-all ${
                !bill.is_active
                  ? "border-slate-700/30 bg-slate-900/30 opacity-50"
                  : bill.due_soon
                    ? "border-amber-500/30 bg-amber-950/10"
                    : "border-slate-700/30 bg-slate-900/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-white">{bill.name}</p>
                    <span className="badge badge-info">{bill.frequency}</span>
                    {bill.due_soon && <span className="badge badge-warning">Due Soon</span>}
                  </div>
                  <p className="text-sm text-amber-300 font-semibold mt-0.5">₹{bill.amount.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Next due: {bill.next_due_date} ({bill.days_left >= 0 ? `${bill.days_left}d left` : "overdue"})
                  </p>
                  {bill.note && <p className="text-xs text-slate-500 truncate">{bill.note}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => onMarkPaid(bill.id)} disabled={loading || !bill.is_active} className="btn btn-success btn-xs">
                    ✓ Paid
                  </button>
                  <button type="button" onClick={() => onToggleActive(bill.id, !bill.is_active)} className="btn btn-ghost btn-xs">
                    {bill.is_active ? "Pause" : "Resume"}
                  </button>
                  <button type="button" onClick={() => setDeleteConfirmId(bill.id)} className="btn btn-danger btn-xs" title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
