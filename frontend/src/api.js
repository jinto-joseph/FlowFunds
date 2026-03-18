const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "https://flowfunds.onrender.com");

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json();
}

export const api = {
  health: () => apiFetch("/health"),
  getTransactions: () => apiFetch("/transactions"),
  getSummary: () => apiFetch("/summary"),
  getCategoryAnalytics: () => apiFetch("/analytics/category"),
  getSurvivalPrediction: () => apiFetch("/predict/survival-days"),
  getPaybackPlan: () => apiFetch("/predict/payback-plan"),
  getDailyTrend: () => apiFetch("/analytics/daily-trend"),
  getTips: () => apiFetch("/analytics/tips"),
  getForecast: () => apiFetch("/predict/forecast"),
  getFinancialHealth: () => apiFetch("/predict/financial-health"),
  getReminders: () => apiFetch("/analytics/reminders"),
  getPatterns: () => apiFetch("/analytics/patterns"),
  getTodayStats: () => apiFetch("/analytics/today"),
  getPeriodAnalysis: (period) => apiFetch(`/analytics/period?period=${period}`),
  getLoans: () => apiFetch("/loans"),
  addLoan: (payload) => apiFetch("/loans", { method: "POST", body: JSON.stringify(payload) }),
  updateLoan: (loanId, payload) => apiFetch(`/loans/${loanId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getBills: () => apiFetch("/bills"),
  addBill: (payload) => apiFetch("/bills", { method: "POST", body: JSON.stringify(payload) }),
  updateBill: (billId, payload) => apiFetch(`/bills/${billId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getGoals: () => apiFetch("/goals"),
  addGoal: (payload) => apiFetch("/goals", { method: "POST", body: JSON.stringify(payload) }),
  updateGoal: (goalId, payload) => apiFetch(`/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getPushConfig: () => apiFetch("/config/push"),
  subscribePush: (payload) => apiFetch("/push/subscribe", { method: "POST", body: JSON.stringify(payload) }),
  sendTestPush: (payload) => apiFetch("/push/send-test", { method: "POST", body: JSON.stringify(payload ?? {}) }),
  addIncome: (payload) => apiFetch("/income", { method: "POST", body: JSON.stringify(payload) }),
  addExpense: (payload) => apiFetch("/expense", { method: "POST", body: JSON.stringify(payload) })
};
