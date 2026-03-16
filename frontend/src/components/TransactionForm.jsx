import { useMemo, useState } from "react";

const categories = ["Food", "Travel", "Study", "Entertainment", "Shopping", "Misc"];

export default function TransactionForm({ mode, onSubmit, loading }) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState("");

  const title = useMemo(() => (mode === "income" ? "Add Income" : "Add Expense"), [mode]);

  function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      amount: Number(amount),
      note,
      date: new Date().toISOString()
    };

    if (mode === "income") payload.source = source || "Other";
    if (mode === "expense") payload.category = category;

    onSubmit(payload);
    setAmount("");
    setSource("");
    setNote("");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>

      <label className="mb-2 block text-sm text-slate-300">Amount</label>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
        required
      />

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
