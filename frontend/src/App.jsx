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
import TodayLedger from "./components/TodayLedger";
import GuideBot from "./components/GuideBot";

const DEFAULT_SUMMARY = { balance: 0, total_income: 0, total_expense: 0 };

function getSafeStoredThreshold() {
  try {
    const raw = localStorage.getItem("flowfunds-threshold");
    const parsed = Number(raw || 500);
    return Number.isFinite(parsed) ? parsed : 500;
  } catch {
    return 500;
  }
}

function getNotificationPermissionSafe() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

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
  const [todayLedger, setTodayLedger] = useState({ today_income: 0, today_expense: 0, today_net: 0, transactions: [] });
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

  const [threshold, setThreshold] = useState(getSafeStoredThreshold);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermissionSafe);
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
        todayLedgerResp,
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
        api.getTodayLedger(),
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
      setTodayLedger(todayLedgerResp ?? { today_income: 0, today_expense: 0, today_net: 0, transactions: [] });
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
    try {
      localStorage.setItem("flowfunds-threshold", String(threshold));
    } catch {
      // Ignore storage failures on restricted/private mobile browsers.
    }
  }, [threshold]);

  useEffect(() => {
    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
  }

  async function enableNotifications() {
    try {
      if (!("Notification" in window)) {
        setNotificationPermission("unsupported");
        setPushStatus("Notifications unsupported on this browser");
        return;
      }
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setPushStatus(permission === "granted" ? "Notifications enabled" : "Notification permission not granted");
    } catch {
      setNotificationPermission("unsupported");
      setPushStatus("Could not enable notifications on this browser");
    }
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

      // Expired/stale subscriptions can survive locally and trigger 410 on server send.
      // Recreate a fresh subscription whenever user enables push again.
      if (existing) {
        try {
          await existing.unsubscribe();
        } catch {
          // Ignore and attempt creating a new subscription anyway.
        }
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.public_key)
      });

      await api.subscribePush(subscription.toJSON());
      setPushStatus("Push enabled with a fresh subscription");
    } catch (pushError) {
      setPushStatus("Push setup failed");
    }
  }

  async function sendTestPush() {
    try {
      const result = await api.sendTestPush({ title: "FlowFunds test", message: "Push delivery check." });
      if (result?.message) {
        setPushStatus(result.message);
      } else if ((result?.removed ?? 0) > 0 && (result?.sent ?? 0) === 0) {
        setPushStatus("Old push subscription expired and was cleaned. Tap Enable push alerts once, then retry test.");
      } else if (result?.failures) {
        setPushStatus(`Test push failed for ${result.failures} subscription(s): ${result.error ?? "unknown error"}`);
      } else {
        setPushStatus("Test push requested from backend");
      }
    } catch (sendError) {
      setPushStatus(`Test push failed: ${sendError?.message ?? "check backend VAPID keys"}`);
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
    } catch (err) {
      setError(`Could not add income: ${err?.message ?? "try again."}`);
      throw err;
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
    } catch (err) {
      setError(`Could not add expense: ${err?.message ?? "try again."}`);
      throw err;
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
    } catch (err) {
      setError(`Could not add payback entry: ${err?.message ?? "try again."}`);
      throw err;
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

  async function handleUpdateTransaction(transactionId, payload) {
    setLoading(true);
    try {
      await api.updateTransaction(transactionId, payload);
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
      <main className="relative z-10 mx-auto min-h-screen max-w-6xl space-y-6 px-3 py-5 text-slate-100 sm:space-y-5 sm:px-4 sm:py-6">
        <header className="space-y-2 rounded-xl border border-slate-700/50 bg-slate-950/70 p-4 backdrop-blur-sm sm:p-5">
          <h1 className="text-2xl font-bold sm:text-3xl">FlowFunds</h1>
          <p className="text-sm text-slate-300 sm:text-base">Smart student expense tracker for irregular income.</p>
          <div id="guide-notification-actions" className="grid grid-cols-1 gap-2 pt-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={installApp}
              disabled={!deferredInstallPrompt}
              className="w-full rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {deferredInstallPrompt ? "Install App" : "Installed / Not available"}
            </button>
            <button
              type="button"
              onClick={enableNotifications}
              disabled={notificationPermission === "granted" || notificationPermission === "denied"}
              className="w-full rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
              className="w-full rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 sm:w-auto"
            >
              Enable push alerts
            </button>
            <button
              type="button"
              onClick={sendTestPush}
              className="w-full rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-sm text-violet-200 sm:w-auto"
            >
              Send test push
            </button>
          </div>
          <p className="pt-2 text-sm text-slate-300">{pushStatus}</p>
        </header>

        <div id="guide-navbar">
          <AppNavbar activePage={activePage} onChange={setActivePage} />
        </div>

        {error && <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</p>}

        {activePage === "dashboard" && (
          <>
            <div id="guide-summary-cards">
              <SummaryCards summary={summary} prediction={prediction} />
            </div>
            <EmergencyAlert balance={summary.balance} threshold={threshold} survivalDays={prediction.days_left} />
            <div id="guide-transaction-forms">
              <section className="grid gap-4 lg:grid-cols-2">
                <TransactionForm mode="income" onSubmit={handleIncome} loading={loading} />
                <TransactionForm mode="expense" onSubmit={handleExpense} loading={loading} />
              </section>
            </div>
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

            <div id="guide-today-ledger">
              <TodayLedger ledger={todayLedger} />
            </div>
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
            <div id="guide-loan-tracker">
              <LoanTracker
                loans={loans}
                outstandingTotal={outstandingLoanTotal}
                balance={summary.balance}
                onAddLoan={handleAddLoan}
                onTogglePaid={handleToggleLoanPaid}
                loading={loading}
              />
            </div>
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
            <div id="guide-goal-tracker">
              <GoalTracker
                goals={goals}
                avgDailySavings={avgDailySavings}
                onAddGoal={handleAddGoal}
                onAddProgress={handleAddGoalProgress}
                loading={loading}
              />
            </div>
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
              <div id="guide-transactions-list">
                <TransactionsList
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  loading={loading}
                />
              </div>
            </section>
          </>
        )}

        {activePage === "insights" && (
          <div id="guide-insights-page">
            <InsightsPage weekly={weeklyAnalysis} monthly={monthlyAnalysis} />
          </div>
        )}
      </main>
      <GuideBot activePage={activePage} onNavigate={setActivePage} />
    </>
  );
}
