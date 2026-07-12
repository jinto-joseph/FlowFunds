const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "loans", label: "Loans", icon: "🏦" },
  { id: "goals", label: "Goals", icon: "🎯" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "ai", label: "AI Advisor", icon: "🤖" },
  { id: "insights", label: "Insights", icon: "💡" },
];

export default function AppNavbar({ activePage, onChange }) {
  return (
    <>
      {/* Desktop / Tablet Top Nav */}
      <nav className="hidden md:block sticky top-3 z-30 glass-card-static p-2 mb-2">
        <ul className="flex gap-1.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(item.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  activePage === item.id
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-200 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav md:hidden">
        <ul className="flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                className={`bottom-nav-item w-full ${activePage === item.id ? "active" : ""}`}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span className="truncate text-[0.6rem]">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
