import { useState, useEffect } from "react";

export default function TransactionForm({ mode, onSubmit, loading, prefillData, onClearPrefill, onRequestScan, onPaymentReady }) {
  const isIncome = mode === "income";
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [bucket, setBucket] = useState("cash_in_hand");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // UPI payment fields (expense only)
  const [payViaUpi, setPayViaUpi] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");

  const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Bills", "Education", "Health", "Misc"];
  const INCOME_SOURCES = ["Freelance", "Part-time Job", "Allowance", "Stipend", "Gift", "Other"];

  // Apply prefill data from QR scan
  useEffect(() => {
    if (prefillData && !isIncome) {
      if (prefillData.amount) setAmount(prefillData.amount);
      if (prefillData.upiId) {
        setUpiId(prefillData.upiId);
        setPayViaUpi(true);
      }
      if (prefillData.payeeName) {
        setPayeeName(prefillData.payeeName);
        setNote(prefillData.payeeName);
      }
      if (prefillData.transactionNote) {
        setNote(prefillData.transactionNote);
      }
      setBucket("bank_account"); // UPI payments are always via bank
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillData]);

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
        // If UPI payment was toggled, show the payment drawer
        if (!isIncome && payViaUpi && upiId) {
          onPaymentReady?.({
            upiId,
            amount: numAmount,
            payeeName,
            note,
          });
        }
        setAmount("");
        setSource("");
        setCategory("");
        setNote("");
        setPayViaUpi(false);
        setUpiId("");
        setPayeeName("");
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">
          <span>{isIncome ? "📥" : "📤"}</span>
          <span>{isIncome ? "Add Income" : "Add Expense"}</span>
        </h3>
        {/* QR Scan button for expenses */}
        {!isIncome && onRequestScan && (
          <button
            type="button"
            onClick={onRequestScan}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 hover:border-violet-400/40 transition-all flex items-center gap-1.5"
          >
            <span>📷</span>
            <span>Scan QR</span>
          </button>
        )}
      </div>

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

        {/* UPI Payment toggle (expense only) */}
        {!isIncome && (
          <div className="border border-slate-700/50 rounded-xl p-3 space-y-3 bg-slate-800/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={payViaUpi}
                  onChange={(e) => setPayViaUpi(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 rounded-full peer-checked:bg-primary/60 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-slate-300 font-medium">⚡ Pay via UPI after recording</span>
            </label>

            {payViaUpi && (
              <div className="space-y-2 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Recipient UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. name@upi or 9876543210@paytm"
                    className="input font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Recipient Name (optional)</label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="e.g. Chai Wala, Canteen"
                    className="input text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

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
            `${isIncome ? "+" : "-"} Record ${isIncome ? "Income" : "Expense"}${!isIncome && payViaUpi ? " & Pay" : ""}`
          )}
        </button>
      </div>
    </form>
  );
}
