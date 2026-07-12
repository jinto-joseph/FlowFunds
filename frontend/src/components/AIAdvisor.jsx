import { useState, useRef, useEffect } from "react";
import { api } from "../api";

const QUICK_ASKS = [
  { label: "📊 Analyze my spending", message: "Give me a detailed analysis of my spending patterns. Where am I spending the most and how can I reduce it?" },
  { label: "💰 How much to save?", message: "Based on my income and expenses, how much should I save each week/month? Give me a specific target." },
  { label: "🎯 Can I reach my goals?", message: "Look at my savings goals and current spending. Am I on track? What changes should I make?" },
  { label: "⚠️ Wasteful spending?", message: "Identify any wasteful or unnecessary spending in my recent transactions. Be specific." },
  { label: "📋 Budget plan", message: "Create a weekly budget plan for me based on my income patterns. Include categories and amounts." },
  { label: "🏦 Loan strategy", message: "What's the best strategy to pay off my loans? Should I pay them now or save first?" },
];

function formatAIMessage(text) {
  // Simple markdown-like formatting for AI responses
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 class="text-base font-semibold text-cyan-300 mt-3 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="text-lg font-bold text-cyan-200 mt-4 mb-1">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 class="text-xl font-bold gradient-text mt-4 mb-2">$1</h2>')
    .replace(/^- (.*$)/gm, '<div class="flex gap-2 ml-1"><span class="text-cyan-400 shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.*$)/gm, '<div class="flex gap-2 ml-1"><span class="text-cyan-400 font-semibold shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '<div class="h-3"></div>')
    .replace(/\n/g, '<br/>');
}

export default function AIAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoAnalysis, setAutoAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const result = await api.aiChat(userMsg);
      setMessages((prev) => [...prev, { role: "ai", text: result.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: `⚠️ Error: ${err?.message ?? "Could not reach AI advisor."}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function loadAutoAnalysis() {
    setAnalysisLoading(true);
    try {
      const result = await api.aiAnalysis();
      setAutoAnalysis(result.analysis);
    } catch (err) {
      setAutoAnalysis(`⚠️ Error: ${err?.message ?? "Could not generate analysis."}`);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Auto Analysis Card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="section-title">
              <span>🤖</span> AI Financial Health Report
            </h2>
            <p className="section-subtitle">Auto-generated analysis of your personal finances</p>
          </div>
          <button
            type="button"
            onClick={loadAutoAnalysis}
            disabled={analysisLoading}
            className="btn btn-primary btn-sm"
          >
            {analysisLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></span>
                Analyzing…
              </span>
            ) : autoAnalysis ? "Refresh" : "Generate Report"}
          </button>
        </div>

        {autoAnalysis && (
          <div
            className="mt-3 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 text-sm leading-relaxed text-slate-200 animate-fade-in"
            dangerouslySetInnerHTML={{ __html: formatAIMessage(autoAnalysis) }}
          />
        )}

        {!autoAnalysis && !analysisLoading && (
          <p className="text-sm text-slate-400 mt-2">
            Click "Generate Report" to get a comprehensive AI analysis of your financial health, spending patterns, and personalized recommendations.
          </p>
        )}
      </div>

      {/* Chat Interface */}
      <div className="glass-card p-5">
        <h2 className="section-title mb-1">
          <span>💬</span> Ask Your AI Advisor
        </h2>
        <p className="section-subtitle mb-4">Ask anything about your finances — savings, budgets, goals, and more</p>

        {/* Quick Ask Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_ASKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => sendMessage(q.message)}
              disabled={loading}
              className="btn btn-ghost btn-xs text-left"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="space-y-3 max-h-[28rem] overflow-y-auto mb-4 p-1">
          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-3">🧠</div>
              <p className="text-sm">Your AI financial advisor is ready.</p>
              <p className="text-xs mt-1 text-slate-600">Ask a question or tap a quick-ask button above.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
            >
              {msg.role === "ai" ? (
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatAIMessage(msg.text) }}
                />
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble chat-bubble-ai">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances…"
            disabled={loading}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
