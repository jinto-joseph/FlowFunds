import { useMemo, useState } from "react";

const categories = ["Food", "Travel", "Study", "Entertainment", "Shopping", "Misc"];

export default function TransactionForm({ mode, onSubmit, loading }) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [incomeBucket, setIncomeBucket] = useState("cash_in_hand");
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const title = useMemo(() => (mode === "income" ? "Add Income" : "Add Expense"), [mode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const normalized = amount.replace(",", ".").trim();
    const numericAmount = Number(normalized);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Enter a valid amount greater than 0.");
      return;
    }

    const payload = {
      amount: numericAmount,
      note,
      date: new Date().toISOString()
    };

    if (mode === "income") {
      payload.source = source || "Other";
      payload.income_bucket = incomeBucket;
    }
    if (mode === "expense") payload.category = category;

    try {
      await onSubmit(payload);
      setAmount("");
      setSource("");
      setIncomeBucket("cash_in_hand");
      setNote("");
    } catch {
      setFormError("Could not save transaction. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>

      <label className="mb-2 block text-sm text-slate-300">Amount</label>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
        placeholder="e.g. 500 or 500.50"
        required
      />

      {formError && (
        <p className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</p>
      )}

      {mode === "income" ? (
        <>
          <label className="mb-2 block text-sm text-slate-300">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
            placeholder="Parents / Sister / Scholarship"
          />

          <label className="mb-2 block text-sm text-slate-300">Receive To</label>
          <select
            value={incomeBucket}
            onChange={(e) => setIncomeBucket(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="cash_in_hand">Cash in hand (liquid cash)</option>
            <option value="bank_account">Cash in bank account</option>
          </select>
        </>
      ) : (
        <>
          <label className="mb-2 block text-sm text-slate-300">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="mb-2 block text-sm text-slate-300">Note</label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
        placeholder="Optional"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-500 px-3 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : title}
      </button>
    </form>
  );
}
