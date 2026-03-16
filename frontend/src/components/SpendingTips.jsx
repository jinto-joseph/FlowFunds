const TYPE_STYLES = {
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  info: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
};

const TYPE_ICON = {
  warning: "⚠️",
  danger: "🔴",
  success: "✅",
  info: "💡"
};

export default function SpendingTips({ tips }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Smart Tips</h3>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li
            key={i}
            className={`rounded-lg border px-3 py-2 text-sm ${TYPE_STYLES[tip.type] ?? TYPE_STYLES.info}`}
          >
            {TYPE_ICON[tip.type] ?? "💡"} {tip.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
