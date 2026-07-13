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
import CashflowAnalytics from "./components/CashflowAnalytics";
import AIAdvisor from "./components/AIAdvisor";
import Login from "./components/Login";
import QRScannerModal from "./components/QRScannerModal";
import UpiPaymentDrawer from "./components/UpiPaymentDrawer";

const DEFAULT_SUMMARY = {
  balance: 0,
  total_income: 0,
  total_expense: 0,
  income_cash_in_hand: 0,
  income_bank_account: 0,
  expense_cash_in_hand: 0,
  expense_bank_account: 0,
};

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

function getCachedState(key, defaultValue) {
  try {
    const raw = localStorage.getItem(`ff_cache_${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setCachedState(key, value) {
  try {
    localStorage.setItem(`ff_cache_${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage failures
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
  const defaultEndDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  }, []);

  const [token, setToken] = useState(() => localStorage.getItem("flowfunds_token") || "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("flowfunds_email") || "");

  const [summary, setSummary] = useState(() => getCachedState("summary", DEFAULT_SUMMARY));
  const [transactions, setTransactions] = useState(() => getCachedState("transactions", []));
  const [categoryData, setCategoryData] = useState(() => getCachedState("categoryData", []));
  const [prediction, setPrediction] = useState(() => getCachedState("prediction", { days_left: null }));
  const [trendData, setTrendData] = useState(() => getCachedState("trendData", []));
  const [tips, setTips] = useState(() => getCachedState("tips", []));
  const [forecastData, setForecastData] = useState(() => getCachedState("forecastData", { forecast: [], historical: [], trend: "stable" }));
  const [patternsData, setPatternsData] = useState(() => getCachedState("patternsData", []));
  const [todayStats, setTodayStats] = useState(() => getCachedState("todayStats", { today: 0, yesterday: 0, week_avg: 0, week_total: 0 }));
  const [todayLedger, setTodayLedger] = useState(() => getCachedState("todayLedger", { today_income: 0, today_expense: 0, today_net: 0, transactions: [] }));
  const [financialHealth, setFinancialHealth] = useState(() => getCachedState("financialHealth", {}));
  const [paybackPlan, setPaybackPlan] = useState(() => getCachedState("paybackPlan", { plan: [] }));
  const [bills, setBills] = useState(() => getCachedState("bills", []));
  const [goals, setGoals] = useState(() => getCachedState("goalsData", {}).goals ?? []);
  const [avgDailySavings, setAvgDailySavings] = useState(() => Number(getCachedState("goalsData", {}).avg_daily_savings ?? 0));
  const [reminders, setReminders] = useState(() => getCachedState("reminders", { upcoming_bills: [], upcoming_loans: [] }));
  const [loans, setLoans] = useState(() => getCachedState("loansData", {}).loans ?? []);
  const [outstandingLoanTotal, setOutstandingLoanTotal] = useState(() => Number(getCachedState("loansData", {}).outstanding_total ?? 0));
  const [weeklyAnalysis, setWeeklyAnalysis] = useState(() => getCachedState("weeklyAnalysis", { categories: [], daily: [] }));
  const [monthlyAnalysis, setMonthlyAnalysis] = useState(() => getCachedState("monthlyAnalysis", { categories: [], daily: [] }));
  const [activePage, setActivePage] = useState(() => localStorage.getItem("flowfunds_active_page") || "dashboard");
  const [showPaybackPrompt, setShowPaybackPrompt] = useState(false);
  const [cashflowFilters, setCashflowFilters] = useState({
    groupBy: "month",
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });
  const [cashflowData, setCashflowData] = useState(() => getCachedState("cashflowData", { series: [], total_income: 0, total_expense: 0, net: 0 }));
  const [cashflowLoading, setCashflowLoading] = useState(false);

  const [threshold, setThreshold] = useState(getSafeStoredThreshold);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermissionSafe);
  const [pushStatus, setPushStatus] = useState("Push not enabled");

  // QR Scanner & UPI Payment state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrPrefillData, setQrPrefillData] = useState(null);
  const [upiPayment, setUpiPayment] = useState(null);

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

  useEffect(() => {
    function handleUnauthorized() {
      setToken("");
      setUserEmail("");
    }
    window.addEventListener("flowfunds-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("flowfunds-unauthorized", handleUnauthorized);
  }, []);

  function handleLogin(newToken, email, userId) {
    localStorage.setItem("flowfunds_token", newToken);
    localStorage.setItem("flowfunds_email", email);
    localStorage.setItem("flowfunds_user_id", userId);
    setToken(newToken);
    setUserEmail(email);
  }

  function handleLogout() {
    localStorage.removeItem("flowfunds_token");
    localStorage.removeItem("flowfunds_email");
    localStorage.removeItem("flowfunds_user_id");
    setToken("");
    setUserEmail("");
  }

  async function fetchAndCache(apiCall, stateSetter, cacheKey, parseFn = (d) => d) {
    try {
      const data = await apiCall();
      const parsed = parseFn(data);
      stateSetter(parsed);
      setCachedState(cacheKey, parsed);
      return { success: true };
    } catch (err) {
      console.warn(`Failed to fetch ${cacheKey}:`, err);
      return { success: false, error: err };
    }
  }

  async function refresh() {
    if (!token) return;
    setError("");
    
    const tasks = [
      fetchAndCache(() => api.getSummary(), setSummary, "summary"),
      fetchAndCache(() => api.getTransactions({ limit: 120, offset: 0 }), (d) => d.transactions ?? [], "transactions"),
      fetchAndCache(() => api.getCategoryAnalytics(), (d) => d.categories ?? [], "categoryData"),
      fetchAndCache(() => api.getSurvivalPrediction(), setPrediction, "prediction"),
      fetchAndCache(() => api.getDailyTrend(), (d) => d.days ?? [], "trendData"),
      fetchAndCache(() => api.getTips(), (d) => d.tips ?? [], "tips"),
      fetchAndCache(() => api.getForecast(), (d) => d ?? { forecast: [], historical: [], trend: "stable" }, "forecastData"),
      fetchAndCache(() => api.getPaybackPlan(), (d) => d ?? { plan: [] }, "paybackPlan"),
      fetchAndCache(() => api.getPatterns(), (d) => d.day_of_week ?? [], "patternsData"),
      fetchAndCache(() => api.getTodayStats(), (d) => d ?? { today: 0, yesterday: 0, week_avg: 0, week_total: 0 }, "todayStats"),
      fetchAndCache(() => api.getTodayLedger(), (d) => d ?? { today_income: 0, today_expense: 0, today_net: 0, transactions: [] }, "todayLedger"),
      fetchAndCache(() => api.getFinancialHealth(), (d) => d ?? {}, "financialHealth"),
      fetchAndCache(() => api.getBills(), (d) => d.bills ?? [], "bills"),
      fetchAndCache(() => api.getGoals(), (d) => {
        setGoals(d.goals ?? []);
        setAvgDailySavings(Number(d.avg_daily_savings ?? 0));
        return d;
      }, "goalsData"),
      fetchAndCache(() => api.getReminders(), (d) => d ?? { upcoming_bills: [], upcoming_loans: [] }, "reminders"),
      fetchAndCache(() => api.getLoans(), (d) => {
        setLoans(d.loans ?? []);
        setOutstandingLoanTotal(Number(d.outstanding_total ?? 0));
        return d;
      }, "loansData"),
      fetchAndCache(() => api.getPeriodAnalysis("weekly"), (d) => d ?? { categories: [], daily: [] }, "weeklyAnalysis"),
      fetchAndCache(() => api.getPeriodAnalysis("monthly"), (d) => d ?? { categories: [], daily: [] }, "monthlyAnalysis"),
    ];

    const results = await Promise.all(tasks);
    const allFailed = results.every(r => !r.success);
    if (allFailed) {
      setError("Backend not reachable. Using cached offline data.");
    }
  }

  useEffect(() => {
    if (token) {
      refresh();
    }
  }, [token]);

  useEffect(() => {
    async function loadCashflow() {
      if (!token) return;
      setCashflowLoading(true);
      try {
        const data = await api.getCashflowAnalytics(cashflowFilters);
        const parsed = data ?? { series: [], total_income: 0, total_expense: 0, net: 0 };
        setCashflowData(parsed);
        setCachedState("cashflowData", parsed);
      } catch {
        // Keep cached state
      } finally {
        setCashflowLoading(false);
      }
    }
    loadCashflow();
  }, [cashflowFilters, token]);

  useEffect(() => {
    try {
      localStorage.setItem("flowfunds-threshold", String(threshold));
    } catch {
      // Ignore storage failures on restricted/private mobile browsers.
    }
  }, [threshold]);

  useEffect(() => {
    try {
      localStorage.setItem("flowfunds_active_page", activePage);
    } catch {
      // Ignore storage failures
    }
  }, [activePage]);

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
    // Optimistic UI Update
    const tempTx = {
      id: -Date.now(),
      kind: "income",
      amount: payload.amount,
      income_bucket: payload.income_bucket,
      source: payload.source,
      date: payload.date,
      note: payload.note || "",
    };

    const prevSummary = summary;
    const prevTransactions = transactions;
    const hadUnpaidLoans = loans.some((l) => !l.is_paid);

    setTransactions((prev) => [tempTx, ...prev]);

    const amt = payload.amount;
    const isBank = payload.income_bucket === "bank_account";
    setSummary((prev) => ({
      ...prev,
      balance: prev.balance + amt,
      total_income: prev.total_income + amt,
      income_bank_account: isBank ? prev.income_bank_account + amt : prev.income_bank_account,
      income_cash_in_hand: !isBank ? prev.income_cash_in_hand + amt : prev.income_cash_in_hand,
    }));

    try {
      await api.addIncome(payload);
      refresh(); // Background sync
      if (hadUnpaidLoans) {
        setShowPaybackPrompt(true);
      }
      return true;
    } catch (err) {
      setSummary(prevSummary);
      setTransactions(prevTransactions);
      setError(`Could not add income: ${err?.message ?? "try again."}`);
      throw err;
    }
  }

  async function handleConfirmPaybacks(paidIds) {
    setShowPaybackPrompt(false);
    if (paidIds.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(paidIds.map((id) => api.updateLoan(id, { is_paid: true })));
      refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleSkipPayback() {
    setShowPaybackPrompt(false);
  }

  async function handleExpense(payload) {
    // Optimistic UI Update
    const tempTx = {
      id: -Date.now(),
      kind: "expense",
      amount: payload.amount,
      income_bucket: payload.expense_bucket,
      category: payload.category,
      date: payload.date,
      note: payload.note || "",
    };

    const prevSummary = summary;
    const prevTransactions = transactions;

    setTransactions((prev) => [tempTx, ...prev]);

    const amt = payload.amount;
    const isBank = payload.expense_bucket === "bank_account";
    setSummary((prev) => ({
      ...prev,
      balance: prev.balance - amt,
      total_expense: prev.total_expense + amt,
      expense_bank_account: isBank ? prev.expense_bank_account + amt : prev.expense_bank_account,
      expense_cash_in_hand: !isBank ? prev.expense_cash_in_hand + amt : prev.expense_cash_in_hand,
    }));

    try {
      await api.addExpense(payload);
      refresh(); // Background sync
      return true;
    } catch (err) {
      setSummary(prevSummary);
      setTransactions(prevTransactions);
      setError(`Could not add expense: ${err?.message ?? "try again."}`);
      throw err;
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

  async function handleDeleteLoan(loanId) {
    setLoading(true);
    try {
      await api.deleteLoan(loanId);
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

  async function handleDeleteBill(billId) {
    setLoading(true);
    try {
      await api.deleteBill(billId);
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

  async function handleDeleteGoal(goalId) {
    setLoading(true);
    try {
      await api.deleteGoal(goalId);
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

  async function handleDeleteTransaction(transactionId) {
    setLoading(true);
    try {
      await api.deleteTransaction(transactionId);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      const result = await api.exportCSV();
      if (result?.csv) {
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flowfunds_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(`Export failed: ${err?.message ?? "try again."}`);
    }
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
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
      <main className="relative z-10 mx-auto min-h-screen max-w-6xl space-y-4 px-3 py-4 text-slate-100 sm:space-y-5 sm:px-4 sm:py-6">
        {/* Header */}
        <header className="glass-card p-4 sm:p-5 animate-fade-in-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl gradient-text">FlowFunds</h1>
              <p className="text-sm text-slate-400 mt-0.5">Smart finance tracker for irregular income</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline mr-2">{userEmail}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost btn-sm mr-1"
                title="Log Out"
              >
                🚪 Logout
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="btn btn-ghost btn-sm hidden sm:flex"
                title="Export CSV"
              >
                📥 Export
              </button>
              {deferredInstallPrompt && (
                <button
                  type="button"
                  onClick={installApp}
                  className="btn btn-primary btn-sm animate-pulse-glow"
                >
                  📱 Install App
                </button>
              )}
            </div>
          </div>

          {/* Notification actions — collapsible on mobile */}
          <details className="mt-3">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
              🔔 Notification Settings
            </summary>
            <div id="guide-notification-actions" data-guide-key="notification-actions" className="grid grid-cols-1 gap-2 pt-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={enableNotifications}
                disabled={notificationPermission === "granted" || notificationPermission === "denied"}
                className="btn btn-ghost btn-sm"
              >
                {notificationPermission === "granted"
                  ? "✅ Notifications enabled"
                  : notificationPermission === "denied"
                    ? "❌ Notifications blocked"
                    : "🔔 Enable notifications"}
              </button>
              <button type="button" onClick={enablePushAlerts} className="btn btn-ghost btn-sm">
                📡 Enable push alerts
              </button>
              <button type="button" onClick={sendTestPush} className="btn btn-ghost btn-sm">
                🧪 Send test push
              </button>
            </div>
            <p className="pt-1 text-xs text-slate-500">{pushStatus}</p>
          </details>
        </header>

        <div id="guide-navbar" data-guide-key="navbar">
          <AppNavbar activePage={activePage} onChange={setActivePage} />
        </div>

        {error && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200 animate-fade-in flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {activePage === "dashboard" && (
          <div className="space-y-4 sm:space-y-5">
            <div id="guide-summary-cards" data-guide-key="summary-cards">
              <SummaryCards summary={summary} prediction={prediction} />
            </div>
            <EmergencyAlert balance={summary.balance} threshold={threshold} survivalDays={prediction.days_left} />
            <div id="guide-transaction-forms" data-guide-key="transaction-forms">
              <section className="grid gap-4 lg:grid-cols-2">
                <TransactionForm mode="income" onSubmit={handleIncome} loading={loading} />
                <TransactionForm
                  mode="expense"
                  onSubmit={handleExpense}
                  loading={loading}
                  prefillData={qrPrefillData}
                  onClearPrefill={() => setQrPrefillData(null)}
                  onRequestScan={() => setShowQRScanner(true)}
                  onPaymentReady={(data) => setUpiPayment(data)}
                />
              </section>
            </div>
            <section data-guide-key="budget-panel" className="glass-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium text-sm">⚡ Low balance threshold</p>
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value || 0))}
                  className="input w-32"
                />
              </div>
              {lowBalance && (
                <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200 animate-pulse-glow">
                  ⚠️ Warning: balance is below your threshold. Spend only in emergency condition.
                </p>
              )}
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
              <div data-guide-key="budget-panel">
                <BudgetPanel summary={summary} />
              </div>
              <div data-guide-key="today-snapshot">
                <TodaySnapshot stats={todayStats} />
              </div>
            </section>

            <div id="guide-today-ledger" data-guide-key="today-ledger">
              <TodayLedger ledger={todayLedger} />
            </div>
            <div data-guide-key="financial-coach">
              <FinancialCoach health={financialHealth} onOpenPayback={() => setShowPaybackPrompt(true)} />
            </div>
          </div>
        )}

        {activePage === "loans" && (
          <div className="space-y-4 sm:space-y-5">
            {summary.balance < 0 && (
              <div className="glass-card border-red-500/30 p-4 animate-fade-in-up">
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
              <div className="glass-card border-amber-500/30 p-4 animate-fade-in-up">
                <p className="font-bold text-amber-300">Unpaid Paybacks Remaining</p>
                <p className="text-sm text-amber-200 mt-1">
                  You still owe <span className="font-bold">₹{outstandingLoanTotal.toFixed(2)}</span> to {loans.filter((l) => !l.is_paid).length} person(s).
                </p>
              </div>
            )}
            {canPaybackNow && (
              <div className="glass-card border-emerald-500/30 p-4 animate-fade-in-up">
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
                    className="btn btn-success btn-sm"
                  >
                    Open Payback Checklist
                  </button>
                </div>
              </div>
            )}
            <div id="guide-loan-tracker" data-guide-key="loan-tracker">
              <LoanTracker
                loans={loans}
                outstandingTotal={outstandingLoanTotal}
                balance={summary.balance}
                onAddLoan={handleAddLoan}
                onTogglePaid={handleToggleLoanPaid}
                onDeleteLoan={handleDeleteLoan}
                loading={loading}
              />
            </div>
            <section className="grid gap-4 lg:grid-cols-2">
              <div data-guide-key="auto-payback">
                <AutoPaybackPlan plan={paybackPlan} onOpenPayback={() => setShowPaybackPrompt(true)} />
              </div>
              <div data-guide-key="recurring-bills">
                <RecurringBills
                  bills={bills}
                  reminders={reminders.upcoming_bills ?? []}
                  onAddBill={handleAddBill}
                  onMarkPaid={handleMarkBillPaid}
                  onToggleActive={handleToggleBillActive}
                  onDeleteBill={handleDeleteBill}
                  loading={loading}
                />
              </div>
            </section>
            {(reminders.upcoming_bills?.length > 0 || reminders.upcoming_loans?.length > 0) && (
              <section className="glass-card border-amber-500/20 p-3 text-amber-100">
                <p className="font-medium text-sm">🔔 Upcoming reminders (next 7 days)</p>
                <p className="text-xs mt-1 text-amber-200/80">
                  Bills due: {reminders.upcoming_bills?.length ?? 0} · Loan dues: {reminders.upcoming_loans?.length ?? 0}
                </p>
              </section>
            )}
          </div>
        )}

        {activePage === "goals" && (
          <div className="space-y-4 sm:space-y-5">
            <div id="guide-goal-tracker" data-guide-key="goal-tracker">
              <GoalTracker
                goals={goals}
                avgDailySavings={avgDailySavings}
                onAddGoal={handleAddGoal}
                onAddProgress={handleAddGoalProgress}
                onDeleteGoal={handleDeleteGoal}
                loading={loading}
              />
            </div>
            <div data-guide-key="financial-coach">
              <FinancialCoach health={financialHealth} onOpenPayback={() => setShowPaybackPrompt(true)} />
            </div>
            <MLForecastChart
              historical={forecastData.historical}
              forecast={forecastData.forecast}
              trend={forecastData.trend}
            />
          </div>
        )}

        {activePage === "analytics" && (
          <div className="space-y-4 sm:space-y-5">
            <CashflowAnalytics
              data={cashflowData}
              filters={cashflowFilters}
              onChangeFilters={setCashflowFilters}
              loading={cashflowLoading}
            />
            <section className="grid gap-4 lg:grid-cols-2">
              <div data-guide-key="spending-tips">
                <SpendingTips tips={tips} />
              </div>
              <div data-guide-key="daily-pattern">
                <DailyPatternChart rows={patternsData} />
              </div>
            </section>
            <div data-guide-key="trend-chart">
              <TrendChart data={trendData} />
            </div>
            <section className="grid gap-4 lg:grid-cols-2">
              <div data-guide-key="category-chart">
                <CategoryChart data={categoryData} />
              </div>
              <div id="guide-transactions-list" data-guide-key="transactions-list">
                <TransactionsList
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  loading={loading}
                />
              </div>
            </section>
          </div>
        )}

        {activePage === "ai" && (
          <AIAdvisor />
        )}

        {activePage === "insights" && (
          <div id="guide-insights-page" data-guide-key="insights-page">
            <InsightsPage weekly={weeklyAnalysis} monthly={monthlyAnalysis} />
          </div>
        )}
      </main>
      <GuideBot activePage={activePage} onNavigate={setActivePage} />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanned={(data) => {
          setQrPrefillData(data);
          setShowQRScanner(false);
          // Launch UPI deep link for payment
          if (data.rawUri) {
            window.open(data.rawUri, "_blank");
          }
          // Switch to dashboard if not already there
          setActivePage("dashboard");
        }}
      />

      {/* UPI Payment Drawer */}
      <UpiPaymentDrawer
        isOpen={!!upiPayment}
        onClose={() => setUpiPayment(null)}
        upiId={upiPayment?.upiId || ""}
        amount={upiPayment?.amount || 0}
        payeeName={upiPayment?.payeeName || ""}
        note={upiPayment?.note || ""}
      />
    </>
  );
}
