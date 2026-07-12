import { useMemo, useState } from "react";

export default function LoanTracker({ loans = [], outstandingTotal = 0, balance = 0, onAddLoan, onTogglePaid, onDeleteLoan, loading }) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const unpaidCount = useMemo(() => loans.filter((l) => !l.is_paid).length, [loans]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const normalized = amount.replace(",", ".").trim();
    const value = Number(normalized);
    if (!person.trim()) {
      setFormError("Enter the lender name.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Enter a valid amount greater than 0.");
      return;
    }

    try {
      await onAddLoan({ person: person.trim(), amount: value, note, due_date: dueDate || null });
      setPerson("");
      setAmount("");
      setNote("");
      setDueDate("");
    } catch {
      setFormError("Could not save payback entry. Please try again.");
    }
  }

  async function confirmDelete() {
    if (!deleteConfirmId || !onDeleteLoan) return;
    try {
      await onDeleteLoan(deleteConfirmId);
    } catch { /* handled by parent */ }
    setDeleteConfirmId(null);
  }

  return (
    <section className="glass-card p-4 sm:p-5 animate-fade-in-up">
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-medium mb-4">Delete this loan entry? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button type="button" onClick={confirmDelete} className="btn btn-danger btn-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="section-title">
          <span>🏦</span> Payback Tracker
        </h3>
        <div className="text-right">
          <p className="stat-label">Outstanding</p>
          <p className="text-xl font-bold text-amber-300">₹{Number(outstandingTotal).toFixed(2)}</p>
          <p className="text-xs text-slate-400">{unpaidCount} unpaid</p>
        </div>
      </div>

      {balance < 0 && loans.length === 0 && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          🔴 Your balance is negative. Track who you owe below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <input value={person} onChange={(e) => setPerson(e.target.value)} className="input" placeholder="Person name" required />
        <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Amount" required />
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Note (optional)" />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
        <button type="submit" disabled={loading} className="btn btn-primary sm:col-span-2 lg:col-span-4">
          + Add Payback Entry
        </button>
      </form>

      {formError && (
        <p className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">{formError}</p>
      )}

      <ul className="mt-4 space-y-2">
        {loans.length === 0 && (
          <li className="text-center py-6 text-sm text-slate-500">
            <span className="text-2xl block mb-1">📝</span>
            No loan entries yet.
          </li>
        )}
        {loans.map((loan) => (
          <li
            key={loan.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-200 ${
              loan.is_paid
                ? "border-emerald-700/30 bg-emerald-950/10 opacity-70"
                : "border-amber-500/20 bg-amber-950/10"
            }`}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <span className={`mt-0.5 shrink-0 badge ${loan.is_paid ? "badge-success" : "badge-danger"}`}>
                {loan.is_paid ? "PAID" : "UNPAID"}
              </span>
              <div className="min-w-0">
                <p className={`font-medium text-sm ${loan.is_paid ? "text-slate-400 line-through" : "text-white"}`}>
                  {loan.person}{" "}
                  <span className={loan.is_paid ? "text-slate-500" : "text-amber-300"}>
                    ₹{Number(loan.amount).toFixed(2)}
                  </span>
                </p>
                {loan.note && <p className="text-xs text-slate-400 truncate">{loan.note}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                  {loan.borrowed_date && <span>Borrowed: {new Date(loan.borrowed_date).toLocaleDateString("en-IN")}</span>}
                  {loan.due_date && <span className="text-amber-400/80">Due: {new Date(loan.due_date).toLocaleDateString("en-IN")}</span>}
                  {loan.is_paid && loan.paid_date && <span className="text-emerald-400/80">Paid: {new Date(loan.paid_date).toLocaleDateString("en-IN")}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={loan.is_paid}
                  onChange={(e) => onTogglePaid(loan.id, e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                {loan.is_paid ? "Paid ✅" : "Mark paid"}
              </label>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(loan.id)}
                className="btn btn-danger btn-xs"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
