export default function TransactionsList({ transactions }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Recent Transactions</h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-400">No transactions yet.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.slice(0, 10).map((tx) => (
            <li key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
              <div>
                <p className="font-medium text-white">{tx.kind === "income" ? tx.source || "Income" : tx.category}</p>
                <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleString()}</p>
              </div>
              <p className={`font-semibold ${tx.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                {tx.kind === "income" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
