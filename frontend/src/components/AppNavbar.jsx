const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "loans", label: "Loans & Bills" },
  { id: "goals", label: "Goals" },
  { id: "analytics", label: "Analytics" },
  { id: "insights", label: "Insights" },
];

export default function AppNavbar({ activePage, onChange }) {
  return (
    <nav className="sticky top-3 z-30 rounded-xl border border-slate-700/60 bg-slate-950/80 p-2 backdrop-blur-md">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onChange(item.id)}
              className={`rounded-lg px-3 py-2.5 text-sm transition ${
                activePage === item.id
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
                  : "bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-slate-500"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
