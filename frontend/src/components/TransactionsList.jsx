import { useState } from "react";

export default function TransactionsList({ transactions = [], onUpdateTransaction, loading }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");

  function startEdit(tx) {
    setError("");
    setEditingId(tx.id);
    setDraft({
      kind: tx.kind,
      amount: String(tx.amount ?? ""),
      source: tx.source ?? "",
      category: tx.category ?? "Misc",
      date: (tx.date ?? "").slice(0, 10),
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

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Recent Transactions (Editable)</h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-400">No transactions yet.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.slice(0, 10).map((tx) => {
            const isEditing = editingId === tx.id;
            return (
              <li key={tx.id} className="rounded-lg bg-slate-950 px-3 py-2">
                {!isEditing ? (
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium text-white">{tx.kind === "income" ? tx.source || "Income" : tx.category || "Expense"}</p>
                      <p className="text-sm text-slate-300">{new Date(tx.date).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${tx.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                        {tx.kind === "income" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        className="rounded-md border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-5">
                      <select
                        value={draft.kind}
                        onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                      <input
                        value={draft.amount}
                        onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                        placeholder="Amount"
                      />
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                      />
                      {draft.kind === "income" ? (
                        <input
                          value={draft.source}
                          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                          placeholder="Source"
                        />
                      ) : (
                        <input
                          value={draft.category}
                          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                          placeholder="Category"
                        />
                      )}
                      <input
                        value={draft.note}
                        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                        placeholder="Note"
                      />
                    </div>

                    {error && <p className="text-sm text-rose-300">{error}</p>}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(tx.id)}
                        disabled={loading}
                        className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300"
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
