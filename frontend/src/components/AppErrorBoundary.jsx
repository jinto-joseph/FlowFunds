import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected app error" };
  }

  componentDidCatch(error, info) {
    // Keep this lightweight: log once for production diagnostics.
    // eslint-disable-next-line no-console
    console.error("FlowFunds UI crash", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="mx-auto min-h-screen max-w-2xl p-6 text-slate-100">
        <section className="mt-10 rounded-xl border border-rose-500/40 bg-rose-500/10 p-5">
          <h1 className="text-xl font-semibold">FlowFunds recovered from an error</h1>
          <p className="mt-2 text-sm text-rose-200">{this.state.message}</p>
          <p className="mt-2 text-xs text-slate-300">
            Try reloading the page. If this happened after enabling notifications, your browser may have partial support.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-slate-500 bg-slate-900 px-3 py-2 text-sm"
          >
            Reload
          </button>
        </section>
      </main>
    );
  }
}
