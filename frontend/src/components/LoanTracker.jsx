import { useMemo, useState } from "react";

export default function LoanTracker({ loans = [], outstandingTotal = 0, balance = 0, onAddLoan, onTogglePaid, loading }) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState("");

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

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">Borrowed / Payback Tracker</h3>
        <div className="text-right">
          <p className="text-sm text-slate-300">Outstanding</p>
          <p className="text-xl font-bold text-amber-300">₹{Number(outstandingTotal).toFixed(2)}</p>
          <p className="text-sm text-slate-400">{unpaidCount} unpaid</p>
        </div>
      </div>

      {/* Hint when balance negative but no loan entries */}
      {balance < 0 && loans.length === 0 && (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          🔴 Your balance is negative. You are likely spending borrowed money.
          Add the lender's name above so you can track the payback.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-2 md:grid-cols-5">
        <input
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          placeholder="Person name"
          required
        />
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          placeholder="Amount (e.g. 500 or 500.50)"
          required
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          placeholder="Note (optional)"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          placeholder="Due date"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-500/90 px-3 py-2 font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60 md:col-span-5"
        >
          Add Payback
        </button>
      </form>

      {formError && (
        <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</p>
      )}

      <ul className="mt-4 space-y-2">
        {loans.length === 0 && <li className="text-sm text-slate-400">No loan entries yet.</li>}
        {loans.map((loan) => (
          <li
            key={loan.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-all ${
              loan.is_paid
                ? "border-emerald-700/40 bg-emerald-950/20 opacity-60"
                : "border-red-500/40 bg-red-950/20"
            }`}
          >
            <div className="flex items-start gap-2">
              {!loan.is_paid && (
                <span className="mt-0.5 flex-shrink-0 rounded-full bg-red-600/80 px-2 py-0.5 text-xs font-bold text-white">
                  UNPAID
                </span>
              )}
              {loan.is_paid && (
                <span className="mt-0.5 flex-shrink-0 rounded-full bg-emerald-600/70 px-2 py-0.5 text-xs font-bold text-white">
                  PAID
                </span>
              )}
              <div>
                <p className={`font-medium ${loan.is_paid ? "text-slate-400 line-through" : "text-white"}`}>
                  {loan.person}{" "}
                  <span className={loan.is_paid ? "text-slate-500 line-through" : "text-amber-300"}>
                    ₹{Number(loan.amount).toFixed(2)}
                  </span>
                </p>
                <p className="text-sm text-slate-300">{loan.note || "No note"}</p>
                {loan.borrowed_date && (
                  <p className="text-sm text-slate-400">
                    Borrowed: {new Date(loan.borrowed_date).toLocaleDateString("en-IN")}
                  </p>
                )}
                {loan.due_date && (
                  <p className="text-sm text-amber-400/90">
                    Due: {new Date(loan.due_date).toLocaleDateString("en-IN")}
                  </p>
                )}
                {loan.is_paid && loan.paid_date && (
                  <p className="text-sm text-emerald-400/90">
                    Paid: {new Date(loan.paid_date).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={loan.is_paid}
                onChange={(e) => onTogglePaid(loan.id, e.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
              {loan.is_paid ? "Paid back ✅" : "Mark as paid"}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
