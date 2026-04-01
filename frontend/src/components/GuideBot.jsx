import { useEffect, useMemo, useRef, useState } from "react";

const STEPS = [
  {
    key: "navbar",
    title: "Navigation Bar",
    page: "dashboard",
    target: "[data-guide-key='navbar']",
    description: "Use this bar to switch between Dashboard, Loans, Goals, Analytics, and Insights.",
    example: "Example: Tap Loans & Bills to add who you borrowed from and due dates.",
  },
  {
    key: "summary-cards",
    title: "Summary Cards",
    page: "dashboard",
    target: "[data-guide-key='summary-cards']",
    description: "These cards show your current balance, total income, total expense, and survival estimate.",
    example: "Example: If balance is low and survival days is 2, avoid non-essential spending this week.",
  },
  {
    key: "transaction-forms",
    title: "Add Income / Expense",
    page: "dashboard",
    target: "[data-guide-key='transaction-forms']",
    description: "Record money in and out here. Accurate entries make predictions and alerts useful.",
    example: "Example: Add income ₹500 from Scholarship, then add expense ₹120 for Food.",
  },
  {
    key: "today-ledger",
    title: "Today Ledger",
    page: "dashboard",
    target: "[data-guide-key='today-ledger']",
    description: "Shows today's total income, expense, net, and transaction list.",
    example: "Example: If net is negative by evening, postpone optional spending.",
  },
  {
    key: "loan-tracker",
    title: "Loan Tracker",
    page: "loans",
    target: "[data-guide-key='loan-tracker']",
    description: "Track borrowed money, due dates, and mark repayments done.",
    example: "Example: Add Person: Arun, Amount: ₹2000, Due Date: next Friday.",
  },
  {
    key: "goal-tracker",
    title: "Goals",
    page: "goals",
    target: "[data-guide-key='goal-tracker']",
    description: "Create savings goals and see ETA based on current saving pattern.",
    example: "Example: Set Laptop goal ₹30000 and add progress +₹500 daily.",
  },
  {
    key: "transactions-list",
    title: "Transactions Editor",
    page: "analytics",
    target: "[data-guide-key='transactions-list']",
    description: "Edit wrong entries here so all charts and insights stay accurate.",
    example: "Example: Fix an expense typed as ₹5000 to ₹500 and save.",
  },
  {
    key: "insights-page",
    title: "Insights Page",
    page: "insights",
    target: "[data-guide-key='insights-page']",
    description: "Weekly and monthly patterns help you understand where your money goes.",
    example: "Example: If weekend spending spikes, set a weekend budget cap.",
  },
  {
    key: "notification-actions",
    title: "Notification Buttons",
    page: "dashboard",
    target: "[data-guide-key='notification-actions']",
    description: "Enable notifications and push alerts when your browser supports them.",
    example: "Example: Use Send test push after setup to verify alert delivery.",
  },
];

const FEATURE_MAP = {
  navbar: STEPS[0],
  "summary-cards": STEPS[1],
  "transaction-forms": STEPS[2],
  "today-ledger": STEPS[3],
  "loan-tracker": STEPS[4],
  "goal-tracker": STEPS[5],
  "transactions-list": STEPS[6],
  "insights-page": STEPS[7],
  "notification-actions": STEPS[8],
  "budget-panel": {
    key: "budget-panel",
    title: "Budget Panel",
    page: "dashboard",
    target: "[data-guide-key='budget-panel']",
    description: "Shows how much you have and helps you stay within practical spending limits.",
    example: "Example: If available amount is low, prioritize food, travel, and study needs first.",
  },
  "today-snapshot": {
    key: "today-snapshot",
    title: "Today Snapshot",
    page: "dashboard",
    target: "[data-guide-key='today-snapshot']",
    description: "Quick comparison of today, yesterday, and weekly average spending.",
    example: "Example: If today > weekly average, reduce optional expenses tomorrow.",
  },
  "financial-coach": {
    key: "financial-coach",
    title: "Financial Coach",
    page: "dashboard",
    target: "[data-guide-key='financial-coach']",
    description: "Gives simple advice based on your balance trend, expenses, and loans.",
    example: "Example: If coach says payback ready, clear a pending loan first.",
  },
  "auto-payback": {
    key: "auto-payback",
    title: "Auto Payback Plan",
    page: "loans",
    target: "[data-guide-key='auto-payback']",
    description: "Suggests whom to pay first and how much, based on your available balance.",
    example: "Example: Follow top recommendation to reduce overdue risk quickly.",
  },
  "recurring-bills": {
    key: "recurring-bills",
    title: "Recurring Bills",
    page: "loans",
    target: "[data-guide-key='recurring-bills']",
    description: "Track repeated bills and upcoming due dates so you do not miss payments.",
    example: "Example: Add hostel rent monthly with due date to get timely reminder context.",
  },
  "spending-tips": {
    key: "spending-tips",
    title: "Spending Tips",
    page: "analytics",
    target: "[data-guide-key='spending-tips']",
    description: "Personalized suggestions to improve money habits based on your data.",
    example: "Example: If eating out is high, set a weekly cap and track compliance.",
  },
  "daily-pattern": {
    key: "daily-pattern",
    title: "Daily Pattern",
    page: "analytics",
    target: "[data-guide-key='daily-pattern']",
    description: "Shows which days typically have higher spending.",
    example: "Example: If Friday is highest, plan transport and food budget before Friday.",
  },
  "trend-chart": {
    key: "trend-chart",
    title: "Trend Chart",
    page: "analytics",
    target: "[data-guide-key='trend-chart']",
    description: "Visual timeline of your daily spending trend.",
    example: "Example: If trend rises 4 days in a row, tighten next 2 days' budget.",
  },
  "category-chart": {
    key: "category-chart",
    title: "Category Chart",
    page: "analytics",
    target: "[data-guide-key='category-chart']",
    description: "Breaks expenses by category like food, travel, and study.",
    example: "Example: If Travel dominates, optimize route or pass usage.",
  },
};

export default function GuideBot({ activePage, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [clickMode, setClickMode] = useState(false);
  const highlightedRef = useRef(null);

  const [selectedFeature, setSelectedFeature] = useState(null);
  const step = useMemo(() => {
    if (selectedFeature && FEATURE_MAP[selectedFeature]) {
      return FEATURE_MAP[selectedFeature];
    }
    return STEPS[index];
  }, [index, selectedFeature]);

  useEffect(() => {
    if (!open || !step) return;
    if (activePage !== step.page) {
      onNavigate(step.page);
      return;
    }

    const timer = setTimeout(() => {
      if (highlightedRef.current) {
        highlightedRef.current.classList.remove("guide-highlight");
      }
      const target = document.querySelector(step.target);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("guide-highlight");
      highlightedRef.current = target;
    }, 160);

    return () => clearTimeout(timer);
  }, [activePage, onNavigate, open, step]);

  useEffect(() => {
    if (open) return;
    setClickMode(false);
    setSelectedFeature(null);
    if (highlightedRef.current) {
      highlightedRef.current.classList.remove("guide-highlight");
      highlightedRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !clickMode) return;

    function onPick(event) {
      const picked = event.target.closest("[data-guide-key]");
      if (!picked) return;

      const key = picked.getAttribute("data-guide-key");
      if (!key || !FEATURE_MAP[key]) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedFeature(key);
      const feature = FEATURE_MAP[key];
      if (feature.page && feature.page !== activePage) {
        onNavigate(feature.page);
      }
    }

    document.body.classList.add("guide-pick-mode");
    document.addEventListener("click", onPick, true);
    return () => {
      document.body.classList.remove("guide-pick-mode");
      document.removeEventListener("click", onPick, true);
    };
  }, [activePage, clickMode, onNavigate, open]);

  function nextStep() {
    setSelectedFeature(null);
    setIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function prevStep() {
    setSelectedFeature(null);
    setIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-lg backdrop-blur"
      >
        {open ? "Close Guide" : "Guide Bot"}
      </button>

      {open && (
        <aside className="fixed bottom-20 right-3 z-50 w-[calc(100%-1.5rem)] max-w-sm rounded-xl border border-slate-600 bg-slate-950/95 p-4 text-slate-100 shadow-2xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wide text-cyan-300">
            {selectedFeature ? "Selected Feature" : `Step ${index + 1} of ${STEPS.length}`}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
          <p className="mt-2 text-sm text-slate-300">{step.description}</p>
          <p className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-sm text-slate-200">
            {step.example}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Tip: Turn on Click-to-Explain, then tap any highlighted section in the app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate(step.page)}
              className="rounded-md border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200"
            >
              Open Feature
            </button>
            <button
              type="button"
              onClick={() => setClickMode((v) => !v)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                clickMode
                  ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                  : "border-slate-600 bg-slate-800 text-slate-200"
              }`}
            >
              {clickMode ? "Click-to-Explain: ON" : "Click-to-Explain: OFF"}
            </button>
            <button
              type="button"
              onClick={prevStep}
              disabled={index === 0}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={index === STEPS.length - 1}
              className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
