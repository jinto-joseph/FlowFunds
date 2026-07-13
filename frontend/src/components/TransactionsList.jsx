import { useState } from "react";

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <p className="text-white font-medium mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" onClick={onConfirm} className="btn btn-danger btn-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsList({ transactions = [], onUpdateTransaction, onDeleteTransaction, loading }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  function startEdit(tx) {
    setError("");
    setEditingId(tx.id);
    setDraft({
      kind: tx.kind,
      amount: String(tx.amount ?? ""),
      source: tx.source ?? "",
      income_bucket: tx.income_bucket ?? "cash_in_hand",
      expense_bucket: tx.expense_bucket ?? tx.income_bucket ?? "cash_in_hand",
      category: tx.category ?? "Misc",
      date: String(tx?.date || "").slice(0, 10),
      note: tx.note ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
    setError("");
  }

  async function saveEdit(id) {
    setError("");
    const amount = Number(String(draft.amount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    try {
      await onUpdateTransaction(id, {
        kind: draft.kind,
        amount,
        source: draft.kind === "income" ? draft.source : null,
        income_bucket: draft.kind === "income" ? draft.income_bucket : null,
        expense_bucket: draft.kind === "expense" ? draft.expense_bucket : null,
        category: draft.kind === "expense" ? draft.category : null,
        date: draft.date,
        note: draft.note,
      });
      setEditingId(null);
      setDraft({});
    } catch (err) {
      setError(err?.message || "Could not update transaction");
    }
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    try {
      await onDeleteTransaction(deleteConfirmId);
    } catch (err) {
      setError(err?.message || "Could not delete transaction");
    }
    setDeleteConfirmId(null);
  }

  return (
    <div className="glass-card p-4 sm:p-5">
      {deleteConfirmId && (
        <ConfirmModal
          message="Delete this transaction? This cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      <h3 className="section-title mb-3">
        <span>📋</span> Recent Transactions
      </h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-slate-400">No transactions yet. Start tracking your income and expenses!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {transactions.slice(0, 15).map((tx) => {
            const isEditing = editingId === tx.id;
            return (
              <li key={tx.id} className={`rounded-xl p-3 transition-all duration-200 ${
                isEditing
                  ? "bg-slate-800/80 border border-cyan-500/20"
                  : "bg-slate-900/50 hover:bg-slate-800/50 border border-transparent"
              }`}>
                {!isEditing ? (
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white text-sm truncate">
                        <span className="mr-1.5">{tx.kind === "income" ? "📥" : "📤"}</span>
                        {tx.kind === "income"
                          ? `${tx.source || "Income"} (${tx.income_bucket === "bank_account" ? "Bank" : "Cash"})`
                          : `${tx.category || "Expense"} (${(tx.expense_bucket ?? tx.income_bucket) === "bank_account" ? "Bank" : "Cash"})`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {tx.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{tx.note}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className={`font-semibold text-sm tabular-nums ${tx.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                        {tx.kind === "income" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        className="btn btn-ghost btn-xs"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(tx.id)}
                        className="btn btn-danger btn-xs"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-scale-in">
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                      <select
                        value={draft.kind}
                        onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
                        className="input"
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                      <input
                        value={draft.amount}
                        onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                        className="input"
                        placeholder="Amount"
                        type="number"
                        step="0.01"
                      />
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                        className="input"
                      />
                    </div>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                      {draft.kind === "income" ? (
                        <>
                          <input
                            value={draft.source}
                            onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                            className="input"
                            placeholder="Source"
                          />
                          <select
                            value={draft.income_bucket}
                            onChange={(e) => setDraft((d) => ({ ...d, income_bucket: e.target.value }))}
                            className="input"
                          >
                            <option value="cash_in_hand">Cash in hand</option>
                            <option value="bank_account">Bank account</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <input
                            value={draft.category}
                            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                            className="input"
                            placeholder="Category"
                          />
                          <select
                            value={draft.expense_bucket}
                            onChange={(e) => setDraft((d) => ({ ...d, expense_bucket: e.target.value }))}
                            className="input"
                          >
                            <option value="cash_in_hand">Paid from cash</option>
                            <option value="bank_account">Paid from bank</option>
                          </select>
                        </>
                      )}
                      <input
                        value={draft.note}
                        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                        className="input"
                        placeholder="Note (optional)"
                      />
                    </div>

                    {error && <p className="text-sm text-rose-300">{error}</p>}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(tx.id)}
                        disabled={loading}
                        className="btn btn-success btn-sm"
                      >
                        ✓ Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-ghost btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
