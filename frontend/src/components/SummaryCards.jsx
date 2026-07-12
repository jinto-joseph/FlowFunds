import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value, prefix = "₹", className = "" }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = display;
    const duration = 600;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (target - start) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span className={className}>
      {prefix}{Math.abs(display).toFixed(2)}
    </span>
  );
}

export default function SummaryCards({ summary, prediction }) {
  const cards = [
    {
      label: "Balance",
      value: summary.balance,
      color: summary.balance >= 0 ? "emerald" : "rose",
      icon: "💰",
      gradient: summary.balance >= 0
        ? "from-emerald-500/15 to-cyan-500/10"
        : "from-rose-500/15 to-amber-500/10",
      border: summary.balance >= 0 ? "border-emerald-500/20" : "border-rose-500/20",
      glow: summary.balance >= 0 ? "shadow-[0_0_20px_rgba(52,211,153,0.08)]" : "shadow-[0_0_20px_rgba(251,113,133,0.08)]",
    },
    {
      label: "Total Income",
      value: summary.total_income,
      color: "cyan",
      icon: "📥",
      gradient: "from-cyan-500/15 to-blue-500/10",
      border: "border-cyan-500/20",
      glow: "shadow-[0_0_20px_rgba(34,211,238,0.08)]",
    },
    {
      label: "Total Expenses",
      value: summary.total_expense,
      color: "rose",
      icon: "📤",
      gradient: "from-rose-500/15 to-pink-500/10",
      border: "border-rose-500/20",
      glow: "shadow-[0_0_20px_rgba(251,113,133,0.08)]",
    },
    {
      label: "Survival Days",
      value: prediction.days_left,
      color: prediction.days_left != null && prediction.days_left <= 7 ? "amber" : "violet",
      icon: "⏳",
      gradient: prediction.days_left != null && prediction.days_left <= 7
        ? "from-amber-500/15 to-orange-500/10"
        : "from-violet-500/15 to-purple-500/10",
      border: prediction.days_left != null && prediction.days_left <= 7 ? "border-amber-500/20" : "border-violet-500/20",
      glow: "shadow-[0_0_20px_rgba(167,139,250,0.08)]",
      isSurvival: true,
    },
  ];

  const colorMap = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
    violet: "text-violet-400",
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-children">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`glass-card bg-gradient-to-br ${card.gradient} ${card.border} ${card.glow} p-4 animate-fade-in-up`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{card.icon}</span>
            <span className="stat-label">{card.label}</span>
          </div>
          <div className={`stat-value ${colorMap[card.color]}`}>
            {card.isSurvival ? (
              card.value != null ? (
                <span>{card.value} <span className="text-base font-medium text-slate-400">days</span></span>
              ) : (
                <span className="text-base text-slate-500">—</span>
              )
            ) : (
              <AnimatedNumber value={card.value} className="" />
            )}
          </div>
          {card.label === "Balance" && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex gap-1 text-xs text-slate-400">
                <span>Cash: ₹{(summary.income_cash_in_hand - summary.expense_cash_in_hand).toFixed(0)}</span>
                <span className="text-slate-600">·</span>
                <span>Bank: ₹{(summary.income_bank_account - summary.expense_bank_account).toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
