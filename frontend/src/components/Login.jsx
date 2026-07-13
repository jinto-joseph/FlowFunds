import { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    const emailVal = email.trim();
    if (!emailVal || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const res = await api.signup({ email: emailVal, password });
        onLogin(res.token, res.email, res.user_id);
      } else {
        const res = await api.login({ email: emailVal, password });
        onLogin(res.token, res.email, res.user_id);
      }
    } catch (err) {
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-radial-gradient">
      {/* Background glow animations */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-82 h-82 bg-accent/20 rounded-full blur-[100px] animate-pulse-slow"></div>

      <div className="w-full max-w-md glass-card p-6 sm:p-8 animate-fade-in-up relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
            FlowFunds
          </h1>
          <p className="text-gray-400 text-sm">
            {isSignup
              ? "Create your secure financial dashboard"
              : "Access your secure financial dashboard"}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-all duration-300"
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-border text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-all duration-300"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3.5 rounded-xl font-bold tracking-wide mt-2 relative overflow-hidden transition-all duration-300"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2 font-semibold">
                Processing...
              </span>
            ) : isSignup ? (
              "Sign Up"
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border/50 pt-6">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
          >
            {isSignup
              ? "Already have an account? Log In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
