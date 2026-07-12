const TYPE_STYLES = {
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  info: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
};

const TYPE_ICON = {
  warning: "⚠️",
  danger: "🔴",
  success: "✅",
  info: "💡"
};

export default function SpendingTips({ tips }) {
  return (
    <div className="glass-card p-4 sm:p-5">
      <h3 className="section-title mb-3">
        <span>💡</span> Smart Tips
      </h3>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li
            key={i}
            className={`rounded-xl border px-3 py-2.5 text-sm animate-fade-in-up ${TYPE_STYLES[tip.type] ?? TYPE_STYLES.info}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {TYPE_ICON[tip.type] ?? "💡"} {tip.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
