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
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data?.detail || data?.message || data?.error || JSON.stringify(data);
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  health: () => apiFetch("/health"),
  getTransactions: ({ limit = 120, offset = 0 } = {}) => apiFetch(`/transactions?limit=${limit}&offset=${offset}`),
  updateTransaction: (id, payload) => apiFetch(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getSummary: () => apiFetch("/summary"),
  getCashflowAnalytics: ({ groupBy = "month", startDate, endDate } = {}) => {
    const params = new URLSearchParams();
    params.set("group_by", groupBy);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    return apiFetch(`/analytics/cashflow?${params.toString()}`);
  },
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
  getTodayLedger: () => apiFetch("/analytics/today-ledger"),
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
