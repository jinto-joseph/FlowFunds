import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import SummaryCards from "./components/SummaryCards";
import TransactionForm from "./components/TransactionForm";
import TransactionsList from "./components/TransactionsList";
import CategoryChart from "./components/CategoryChart";
import TrendChart from "./components/TrendChart";
import BudgetPanel from "./components/BudgetPanel";
import SpendingTips from "./components/SpendingTips";
import WebGLCanvas from "./components/WebGLCanvas";
import EmergencyAlert from "./components/EmergencyAlert";
import MLForecastChart from "./components/MLForecastChart";
import DailyPatternChart from "./components/DailyPatternChart";
import TodaySnapshot from "./components/TodaySnapshot";
import LoanTracker from "./components/LoanTracker";
import InsightsPage from "./components/InsightsPage";
import PaybackPromptModal from "./components/PaybackPromptModal";
import FinancialCoach from "./components/FinancialCoach";
import AutoPaybackPlan from "./components/AutoPaybackPlan";
import RecurringBills from "./components/RecurringBills";
import GoalTracker from "./components/GoalTracker";
import AppNavbar from "./components/AppNavbar";

const DEFAULT_SUMMARY = { balance: 0, total_income: 0, total_expense: 0 };

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function App() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [transactions, setTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [prediction, setPrediction] = useState({ days_left: null });
  const [trendData, setTrendData] = useState([]);
  const [tips, setTips] = useState([]);
  const [forecastData, setForecastData] = useState({ forecast: [], historical: [], trend: "stable" });
  const [patternsData, setPatternsData] = useState([]);
  const [todayStats, setTodayStats] = useState({ today: 0, yesterday: 0, week_avg: 0, week_total: 0 });
  const [financialHealth, setFinancialHealth] = useState({});
  const [paybackPlan, setPaybackPlan] = useState({ plan: [] });
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [avgDailySavings, setAvgDailySavings] = useState(0);
  const [reminders, setReminders] = useState({ upcoming_bills: [], upcoming_loans: [] });
  const [loans, setLoans] = useState([]);
  const [outstandingLoanTotal, setOutstandingLoanTotal] = useState(0);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState({ categories: [], daily: [] });
  const [monthlyAnalysis, setMonthlyAnalysis] = useState({ categories: [], daily: [] });
  const [activePage, setActivePage] = useState("dashboard");
  const [showPaybackPrompt, setShowPaybackPrompt] = useState(false);

  const [threshold, setThreshold] = useState(() => Number(localStorage.getItem("flowfunds-threshold") || 500));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [pushStatus, setPushStatus] = useState("Push not enabled");

  const lowBalance = useMemo(() => summary.balance < threshold, [summary.balance, threshold]);
  const hasUnpaidLoans = useMemo(() => loans.some((l) => !l.is_paid), [loans]);
  const canPaybackNow = useMemo(
    () => hasUnpaidLoans && outstandingLoanTotal > 0 && summary.balance >= outstandingLoanTotal,
    [hasUnpaidLoans, outstandingLoanTotal, summary.balance]
  );
  const debtMode = useMemo(() => summary.balance < 0 || hasUnpaidLoans, [summary.balance, hasUnpaidLoans]);
  const balanceHealth = useMemo(() => {
    if (threshold <= 0) return 1;
    return Math.max(0, Math.min(1, summary.balance / threshold));
  }, [summary.balance, threshold]);

  async function refresh() {
    setError("");
    try {
      const [
        summaryResp,
        transactionsResp,
        categoryResp,
        predictionResp,
        trendResp,
        tipsResp,
        forecastResp,
        paybackResp,
        patternsResp,
        todayResp,
        healthResp,
        billsResp,
        goalsResp,
        remindersResp,
        loansResp,
        weeklyResp,
        monthlyResp,
      ] = await Promise.all([
        api.getSummary(),
        api.getTransactions(),
        api.getCategoryAnalytics(),
        api.getSurvivalPrediction(),
        api.getDailyTrend(),
        api.getTips(),
        api.getForecast(),
        api.getPaybackPlan(),
        api.getPatterns(),
        api.getTodayStats(),
        api.getFinancialHealth(),
        api.getBills(),
        api.getGoals(),
        api.getReminders(),
        api.getLoans(),
        api.getPeriodAnalysis("weekly"),
        api.getPeriodAnalysis("monthly"),
      ]);

      setSummary(summaryResp);
      setTransactions(transactionsResp.transactions ?? []);
      setCategoryData(categoryResp.categories ?? []);
      setPrediction(predictionResp);
      setTrendData(trendResp.days ?? []);
      setTips(tipsResp.tips ?? []);
      setForecastData(forecastResp ?? { forecast: [], historical: [], trend: "stable" });
      setPaybackPlan(paybackResp ?? { plan: [] });
      setPatternsData(patternsResp.day_of_week ?? []);
      setTodayStats(todayResp ?? { today: 0, yesterday: 0, week_avg: 0, week_total: 0 });
      setFinancialHealth(healthResp ?? {});
      setBills(billsResp.bills ?? []);
      setGoals(goalsResp.goals ?? []);
      setAvgDailySavings(Number(goalsResp.avg_daily_savings ?? 0));
      setReminders(remindersResp ?? { upcoming_bills: [], upcoming_loans: [] });
      setLoans(loansResp.loans ?? []);
      setOutstandingLoanTotal(Number(loansResp.outstanding_total ?? 0));
      setWeeklyAnalysis(weeklyResp ?? { categories: [], daily: [] });
      setMonthlyAnalysis(monthlyResp ?? { categories: [], daily: [] });
    } catch (err) {
      setError("Backend not reachable. Start FastAPI server on port 8000.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    localStorage.setItem("flowfunds-threshold", String(threshold));
  }, [threshold]);

  useEffect(() => {
    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!lowBalance || notificationPermission !== "granted") return;

    new Notification("FlowFunds: Low balance", {
      body: `⚠️ Balance is low (₹${summary.balance.toFixed(2)}). Spend only for emergency needs.`
    });
  }, [lowBalance, notificationPermission, summary.balance]);

  useEffect(() => {
    if (!debtMode || notificationPermission !== "granted") return;
    new Notification("FlowFunds: Payback pending", {
      body: hasUnpaidLoans
        ? `You still need to return ₹${outstandingLoanTotal.toFixed(2)}. Mark as paid once done.`
        : "Your balance is negative. You likely borrowed money. Repay as soon as possible.",
    });
  }, [debtMode, hasUnpaidLoans, notificationPermission, outstandingLoanTotal]);

  useEffect(() => {
    if (!canPaybackNow || notificationPermission !== "granted") return;
    new Notification("FlowFunds: Ready to repay loans", {
      body: `You now have enough balance to pay back ₹${outstandingLoanTotal.toFixed(2)}. Open payback checklist.`,
    });
  }, [canPaybackNow, notificationPermission, outstandingLoanTotal]);

  async function installApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function enablePushAlerts() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("Push unsupported on this device/browser");
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setPushStatus("Notification permission not granted");
        return;
      }

      const config = await api.getPushConfig();
      if (!config.public_key) {
        setPushStatus("Backend VAPID public key missing");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.public_key)
        }));

      await api.subscribePush(subscription.toJSON());
      setPushStatus("Push enabled and saved on backend");
    } catch (pushError) {
      setPushStatus("Push setup failed");
    }
  }

  async function sendTestPush() {
    try {
      await api.sendTestPush({ title: "FlowFunds test", message: "Push delivery check." });
      setPushStatus("Test push requested from backend");
    } catch (sendError) {
      setPushStatus("Test push failed (check backend VAPID keys)");
    }
  }

  async function handleIncome(payload) {
    setLoading(true);
    // snapshot unpaid loans BEFORE refresh so we know whether to prompt
    const hadUnpaidLoans = loans.some((l) => !l.is_paid);
    try {
      await api.addIncome(payload);
      await refresh();
      if (hadUnpaidLoans) {
        setShowPaybackPrompt(true);
      }
      return true;
    } catch {
      setError("Could not add income. Check backend connection and try again.");
      throw new Error("Income submit failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPaybacks(paidIds) {
    setShowPaybackPrompt(false);
    if (paidIds.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(paidIds.map((id) => api.updateLoan(id, { is_paid: true })));
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleSkipPayback() {
    setShowPaybackPrompt(false);
  }

  async function handleExpense(payload) {
    setLoading(true);
    try {
      await api.addExpense(payload);
      await refresh();
      return true;
    } catch {
      setError("Could not add expense. Check backend connection and try again.");
      throw new Error("Expense submit failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLoan(payload) {
    setLoading(true);
    try {
      await api.addLoan(payload);
      await refresh();
      return true;
    } catch {
      setError("Could not add payback entry. Check backend connection and try again.");
      throw new Error("Loan submit failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLoanPaid(loanId, isPaid) {
    setLoading(true);
    try {
      await api.updateLoan(loanId, { is_paid: isPaid });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBill(payload) {
    setLoading(true);
    try {
      await api.addBill(payload);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkBillPaid(billId) {
    setLoading(true);
    try {
      await api.updateBill(billId, { mark_paid: true });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleBillActive(billId, isActive) {
    setLoading(true);
    try {
      await api.updateBill(billId, { is_active: isActive });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGoal(payload) {
    setLoading(true);
    try {
      await api.addGoal(payload);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGoalProgress(goalId, amount) {
    setLoading(true);
    try {
      await api.updateGoal(goalId, { add_amount: amount });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showPaybackPrompt && (
        <PaybackPromptModal
          loans={loans}
          outstandingTotal={outstandingLoanTotal}
          onConfirm={handleConfirmPaybacks}
          onSkip={handleSkipPayback}
        />
      )}
      <WebGLCanvas
        balanceHealth={balanceHealth}
        totalIncome={summary.total_income}
        totalExpense={summary.total_expense}
        balance={summary.balance}
        hasUnpaidLoans={hasUnpaidLoans}
        paybackReady={canPaybackNow}
        sceneMode={activePage}
      />
      <main className="relative z-10 mx-auto min-h-screen max-w-6xl space-y-5 px-4 py-6 text-slate-100">
        <header className="space-y-1 rounded-xl border border-slate-700/50 bg-slate-950/70 p-4 backdrop-blur-sm">
          <h1 className="text-3xl font-bold">FlowFunds</h1>
          <p className="text-slate-400">Smart student expense tracker for irregular income.</p>
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={installApp}
              disabled={!deferredInstallPrompt}
              className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deferredInstallPrompt ? "Install App" : "Installed / Not available"}
            </button>
            <button
              type="button"
              onClick={enableNotifications}
              disabled={notificationPermission === "granted" || notificationPermission === "denied"}
              className="rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {notificationPermission === "granted"
                ? "Notifications enabled"
                : notificationPermission === "denied"
                  ? "Notifications blocked"
                  : "Enable notifications"}
            </button>
            <button
              type="button"
              onClick={enablePushAlerts}
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200"
            >
              Enable push alerts
            </button>
            <button
              type="button"
              onClick={sendTestPush}
              className="rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-1 text-sm text-violet-200"
            >
              Send test push
            </button>
          </div>
          <p className="pt-2 text-xs text-slate-400">{pushStatus}</p>
        </header>

        <AppNavbar activePage={activePage} onChange={setActivePage} />

        {error && <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</p>}

        {activePage === "dashboard" && (
          <>
            <SummaryCards summary={summary} prediction={prediction} />
            <EmergencyAlert balance={summary.balance} threshold={threshold} survivalDays={prediction.days_left} />
            <section className="grid gap-4 lg:grid-cols-2">
              <TransactionForm mode="income" onSubmit={handleIncome} loading={loading} />
              <TransactionForm mode="expense" onSubmit={handleExpense} loading={loading} />
            </section>
            <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium">Low balance threshold</p>
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value || 0))}
                  className="w-36 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
              {lowBalance && (
                <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-rose-200">
                  ⚠️ Warning: balance is below your threshold. Spend only in emergency condition.
                </p>
              )}
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
              <BudgetPanel summary={summary} />
              <TodaySnapshot stats={todayStats} />
            </section>
            <FinancialCoach health={financialHealth} onOpenPayback={() => setShowPaybackPrompt(true)} />
          </>
        )}

        {activePage === "loans" && (
          <>
            {summary.balance < 0 && (
              <div className="rounded-xl border-2 border-red-500/70 bg-red-950/30 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <p className="font-bold text-red-300 text-lg">You are in Debt!</p>
                    <p className="text-sm text-red-200 mt-1">
                      Your balance is <span className="font-bold">₹{Math.abs(summary.balance).toFixed(2)} in the negative</span>.
                      Your expenses exceed your income.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {hasUnpaidLoans && (
              <div className="rounded-xl border-2 border-amber-500/60 bg-amber-950/30 p-4">
                <p className="font-bold text-amber-300">Unpaid Paybacks Remaining</p>
                <p className="text-sm text-amber-200 mt-1">
                  You still owe <span className="font-bold">₹{outstandingLoanTotal.toFixed(2)}</span> to {loans.filter((l) => !l.is_paid).length} person(s).
                </p>
              </div>
            )}
            {canPaybackNow && (
              <div className="rounded-xl border-2 border-emerald-500/60 bg-emerald-950/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-emerald-300">Great news: You can clear your loans now</p>
                    <p className="text-sm text-emerald-200 mt-1">
                      Current balance can cover your outstanding payback of ₹{outstandingLoanTotal.toFixed(2)}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPaybackPrompt(true)}
                    className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"
                  >
                    Open Payback Checklist
                  </button>
                </div>
              </div>
            )}
            <LoanTracker
              loans={loans}
              outstandingTotal={outstandingLoanTotal}
              balance={summary.balance}
              onAddLoan={handleAddLoan}
              onTogglePaid={handleToggleLoanPaid}
              loading={loading}
            />
            <section className="grid gap-4 lg:grid-cols-2">
              <AutoPaybackPlan plan={paybackPlan} onOpenPayback={() => setShowPaybackPrompt(true)} />
              <RecurringBills
                bills={bills}
                reminders={reminders.upcoming_bills ?? []}
                onAddBill={handleAddBill}
                onMarkPaid={handleMarkBillPaid}
                onToggleActive={handleToggleBillActive}
                loading={loading}
              />
            </section>
            {(reminders.upcoming_bills?.length > 0 || reminders.upcoming_loans?.length > 0) && (
              <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-100">
                <p className="font-medium">Upcoming reminders (next 7 days)</p>
                <p className="text-sm mt-1">
                  Bills due: {reminders.upcoming_bills?.length ?? 0} · Loan dues: {reminders.upcoming_loans?.length ?? 0}
                </p>
              </section>
            )}
          </>
        )}

        {activePage === "goals" && (
          <>
            <GoalTracker
              goals={goals}
              avgDailySavings={avgDailySavings}
              onAddGoal={handleAddGoal}
              onAddProgress={handleAddGoalProgress}
              loading={loading}
            />
            <FinancialCoach health={financialHealth} onOpenPayback={() => setShowPaybackPrompt(true)} />
            <MLForecastChart
              historical={forecastData.historical}
              forecast={forecastData.forecast}
              trend={forecastData.trend}
            />
          </>
        )}

        {activePage === "analytics" && (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <SpendingTips tips={tips} />
              <DailyPatternChart rows={patternsData} />
            </section>
            <TrendChart data={trendData} />
            <section className="grid gap-4 lg:grid-cols-2">
              <CategoryChart data={categoryData} />
              <TransactionsList transactions={transactions} />
            </section>
          </>
        )}

        {activePage === "insights" && <InsightsPage weekly={weeklyAnalysis} monthly={monthlyAnalysis} />}
      </main>
    </>
  );
}
