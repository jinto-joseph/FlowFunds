import { useEffect, useMemo, useRef, useState } from "react";

const STEPS = [
  {
    title: "Navigation Bar",
    page: "dashboard",
    target: "#guide-navbar",
    description: "Use this bar to switch between Dashboard, Loans, Goals, Analytics, and Insights.",
    example: "Example: Tap Loans & Bills to add who you borrowed from and due dates.",
  },
  {
    title: "Summary Cards",
    page: "dashboard",
    target: "#guide-summary-cards",
    description: "These cards show your current balance, total income, total expense, and survival estimate.",
    example: "Example: If balance is low and survival days is 2, avoid non-essential spending this week.",
  },
  {
    title: "Add Income / Expense",
    page: "dashboard",
    target: "#guide-transaction-forms",
    description: "Record money in and out here. Accurate entries make predictions and alerts useful.",
    example: "Example: Add income ₹500 from Scholarship, then add expense ₹120 for Food.",
  },
  {
    title: "Today Ledger",
    page: "dashboard",
    target: "#guide-today-ledger",
    description: "Shows today's total income, expense, net, and transaction list.",
    example: "Example: If net is negative by evening, postpone optional spending.",
  },
  {
    title: "Loan Tracker",
    page: "loans",
    target: "#guide-loan-tracker",
    description: "Track borrowed money, due dates, and mark repayments done.",
    example: "Example: Add Person: Arun, Amount: ₹2000, Due Date: next Friday.",
  },
  {
    title: "Goals",
    page: "goals",
    target: "#guide-goal-tracker",
    description: "Create savings goals and see ETA based on current saving pattern.",
    example: "Example: Set Laptop goal ₹30000 and add progress +₹500 daily.",
  },
  {
    title: "Transactions Editor",
    page: "analytics",
    target: "#guide-transactions-list",
    description: "Edit wrong entries here so all charts and insights stay accurate.",
    example: "Example: Fix an expense typed as ₹5000 to ₹500 and save.",
  },
  {
    title: "Insights Page",
    page: "insights",
    target: "#guide-insights-page",
    description: "Weekly and monthly patterns help you understand where your money goes.",
    example: "Example: If weekend spending spikes, set a weekend budget cap.",
  },
  {
    title: "Notification Buttons",
    page: "dashboard",
    target: "#guide-notification-actions",
    description: "Enable notifications and push alerts when your browser supports them.",
    example: "Example: Use Send test push after setup to verify alert delivery.",
  },
];

export default function GuideBot({ activePage, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const highlightedRef = useRef(null);

  const step = useMemo(() => STEPS[index], [index]);

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
    if (highlightedRef.current) {
      highlightedRef.current.classList.remove("guide-highlight");
      highlightedRef.current = null;
    }
  }, [open]);

  function nextStep() {
    setIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function prevStep() {
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
            Step {index + 1} of {STEPS.length}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
          <p className="mt-2 text-sm text-slate-300">{step.description}</p>
          <p className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-sm text-slate-200">
            {step.example}
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
