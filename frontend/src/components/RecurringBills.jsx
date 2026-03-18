import { useState } from "react";

export default function RecurringBills({ bills = [], reminders = [], onAddBill, onMarkPaid, onToggleActive, loading }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  async function submit(event) {
    event.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) return;
    await onAddBill({ name: name.trim(), amount: value, frequency, next_due_date: nextDueDate, note });
    setName("");
    setAmount("");
    setNote("");
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Recurring Bills + Reminders</h3>
        <p className="text-xs text-slate-400">{reminders.length} due in 7 days</p>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bill name" className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" required />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" required />
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" required />
        <button type="submit" disabled={loading} className="rounded-lg bg-cyan-500/90 px-3 py-2 font-medium text-slate-900 hover:bg-cyan-400 disabled:opacity-60">Add Bill</button>
      </form>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />

      <ul className="mt-3 space-y-2">
        {bills.length === 0 && <li className="text-sm text-slate-400">No recurring bills yet.</li>}
        {bills.map((bill) => (
          <li key={bill.id} className={`rounded-lg border px-3 py-2 ${bill.is_active ? "border-slate-700 bg-slate-950" : "border-slate-800 bg-slate-950/60 opacity-60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-white">
                {bill.name} · <span className="text-cyan-300">₹{Number(bill.amount).toFixed(2)}</span> · {bill.frequency}
              </p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${bill.due_soon ? "bg-amber-500/20 text-amber-300" : "bg-slate-700 text-slate-300"}`}>
                due in {bill.days_left}d
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Next due: {bill.next_due_date} {bill.note ? `· ${bill.note}` : ""}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => onMarkPaid(bill.id)} className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">Mark Paid</button>
              <button type="button" onClick={() => onToggleActive(bill.id, !bill.is_active)} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">
                {bill.is_active ? "Pause" : "Resume"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
