export default function EmergencyAlert({ balance, threshold, survivalDays }) {
  if (balance >= threshold) return null;

  const ratio = balance / threshold;
  const isCritical = ratio < 0.5;
  const dailyBudget = survivalDays && survivalDays > 0 ? (balance / survivalDays).toFixed(0) : null;

  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        isCritical
          ? "border-red-500/80 bg-red-950/40 shadow-[0_0_24px_rgba(239,68,68,0.25)]"
          : "border-amber-500/70 bg-amber-950/30 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
      } animate-pulse-glow`}
    >
      <div className="flex flex-wrap items-start gap-4">
        {/* Icon + severity */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">{isCritical ? "🚨" : "⚠️"}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
              isCritical ? "bg-red-500/30 text-red-300" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {isCritical ? "Critical" : "Warning"}
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base ${isCritical ? "text-red-200" : "text-amber-200"}`}>
            {isCritical
              ? "CRITICAL: Balance dangerously low — Emergency mode only"
              : "Low balance — Limit spending to essentials"}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Your balance of{" "}
            <span className={`font-bold ${isCritical ? "text-red-300" : "text-amber-300"}`}>
              ₹{balance.toFixed(2)}
            </span>{" "}
            has dropped below your alert threshold of ₹{threshold}.
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-slate-400">
            {dailyBudget && (
              <li>
                💡 Max recommended daily spend:{" "}
                <span className="font-semibold text-emerald-300">₹{dailyBudget}</span>
              </li>
            )}
            {survivalDays !== null && survivalDays !== undefined && (
              <li>
                ⏳ At current pace, money lasts{" "}
                <span className={`font-semibold ${survivalDays <= 3 ? "text-red-300" : "text-amber-300"}`}>
                  {survivalDays} more day{survivalDays !== 1 ? "s" : ""}
                </span>
              </li>
            )}
            <li>🚫 Avoid: shopping, entertainment, non-essentials</li>
            <li>✅ Allow: food, transport, medicine, urgent study material</li>
          </ul>
        </div>

        {/* Balance display */}
        <div className="text-right">
          <p className={`text-3xl font-bold tabular-nums ${isCritical ? "text-red-400" : "text-amber-400"}`}>
            ₹{balance.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">remaining</p>
          {/* Progress bar */}
          <div className="mt-2 h-2 w-28 rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${isCritical ? "bg-red-500" : "bg-amber-400"}`}
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{(ratio * 100).toFixed(0)}% of threshold</p>
        </div>
      </div>
    </div>
  );
}
