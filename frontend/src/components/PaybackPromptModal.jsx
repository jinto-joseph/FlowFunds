import { useState } from "react";

export default function PaybackPromptModal({ loans = [], outstandingTotal = 0, onConfirm, onSkip }) {
  const unpaid = loans.filter((l) => !l.is_paid);
  const [checked, setChecked] = useState({});

  function toggle(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleConfirm() {
    const paidIds = unpaid.filter((l) => checked[l.id]).map((l) => l.id);
    onConfirm(paidIds);
  }

  if (unpaid.length === 0) return null;

  const anyChecked = unpaid.some((l) => checked[l.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-slate-900 p-6 shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="mb-5">
          <div className="mb-2 inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 uppercase tracking-wide">
            💸 Income Received
          </div>
          <h2 className="text-xl font-bold text-white">Did you pay back the lender?</h2>
          <p className="mt-1 text-sm text-slate-400">
            You received income while you have outstanding debts. Tick only the people
            you have <span className="text-emerald-400 font-medium">actually</span> returned money to.
          </p>
        </div>

        {/* Loan list */}
        <ul className="mb-5 space-y-2 max-h-64 overflow-y-auto pr-1">
          {unpaid.map((loan) => (
            <li
              key={loan.id}
              onClick={() => toggle(loan.id)}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                checked[loan.id]
                  ? "border-emerald-500/60 bg-emerald-950/40"
                  : "border-slate-700 bg-slate-800 hover:border-amber-500/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!checked[loan.id]}
                  onChange={() => toggle(loan.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 flex-shrink-0 accent-emerald-500"
                />
                <div>
                  <p className="font-semibold text-white">{loan.person}</p>
                  {loan.note && <p className="text-xs text-slate-400">{loan.note}</p>}
                  <p className="text-xs text-slate-500">
                    Borrowed on {new Date(loan.borrowed_date).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <span
                className={`ml-4 flex-shrink-0 text-base font-bold ${
                  checked[loan.id] ? "text-emerald-400 line-through" : "text-amber-300"
                }`}
              >
                ₹{Number(loan.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        {/* Outstanding total */}
        <div className="mb-5 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 flex justify-between text-sm">
          <span className="text-slate-400">Total outstanding</span>
          <span className="font-bold text-amber-300">₹{Number(outstandingTotal).toFixed(2)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!anyChecked}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            ✅ Mark as Paid
          </button>
          <button
            onClick={onSkip}
            className="flex-1 rounded-xl border border-slate-600 px-4 py-2.5 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Not Yet
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          The debt alert will stay active until all paybacks are marked.
        </p>
      </div>
    </div>
  );
}
