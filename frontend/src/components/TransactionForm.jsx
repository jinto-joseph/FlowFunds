import { useState } from "react";

export default function TransactionForm({ mode, onSubmit, loading }) {
  const isIncome = mode === "income";
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [bucket, setBucket] = useState("cash_in_hand");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Bills", "Education", "Health", "Misc"];
  const INCOME_SOURCES = ["Freelance", "Part-time Job", "Allowance", "Stipend", "Gift", "Other"];

  async function handleSubmit(e) {
    e.preventDefault();
    const numAmount = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(numAmount) || numAmount <= 0) return;

    setSubmitting(true);
    const payload = isIncome
      ? { amount: numAmount, source: source || "Other", income_bucket: bucket, date: new Date(date).toISOString(), note }
      : { amount: numAmount, category: category || "Misc", expense_bucket: bucket, date: new Date(date).toISOString(), note };

    try {
      const success = await onSubmit(payload);
      if (success) {
        setAmount("");
        setSource("");
        setCategory("");
        setNote("");
      }
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`glass-card p-4 sm:p-5 animate-fade-in-up ${
        isIncome
          ? "border-emerald-500/10 hover:border-emerald-500/20"
          : "border-rose-500/10 hover:border-rose-500/20"
      }`}
    >
      <h3 className="section-title mb-4">
        <span>{isIncome ? "📥" : "📤"}</span>
        <span>{isIncome ? "Add Income" : "Add Expense"}</span>
      </h3>

      <div className="space-y-3">
        {/* Amount - prominent */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className={`input text-lg font-semibold ${
              isIncome ? "focus:border-emerald-500/50 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.1)]"
                : "focus:border-rose-500/50 focus:shadow-[0_0_0_3px_rgba(251,113,133,0.1)]"
            }`}
          />
        </div>

        {/* Category/Source chips */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            {isIncome ? "Source" : "Category"}
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(isIncome ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((item) => {
              const isActive = isIncome ? source === item : category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => isIncome ? setSource(item) : setCategory(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                    isActive
                      ? isIncome
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={isIncome ? source : category}
            onChange={(e) => isIncome ? setSource(e.target.value) : setCategory(e.target.value)}
            placeholder={isIncome ? "Or type custom source…" : "Or type custom category…"}
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">
              {isIncome ? "Received to" : "Paid from"}
            </label>
            <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="input">
              <option value="cash_in_hand">💵 Cash in hand</option>
              <option value="bank_account">🏦 Bank account</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || submitting || !amount}
          className={`btn w-full font-semibold ${
            isIncome ? "btn-success" : "btn-danger"
          }`}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            `${isIncome ? "+" : "-"} Record ${isIncome ? "Income" : "Expense"}`
          )}
        </button>
      </div>
    </form>
  );
}
