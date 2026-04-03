import React, { Component } from "react";
import { Toaster } from "sonner";
import Page from "./app/page";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state: { hasError: boolean; error: any };
  props: { children: React.ReactNode };

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "문제가 발생했습니다. 나중에 다시 시도해 주세요.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error && parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = "권한이 없습니다. 로그인 상태를 확인해 주세요.";
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-[#0a0e27]">
          <div className="glass-card p-8 max-w-sm w-full flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl">
              🚌
            </div>
            <h2 className="text-xl font-bold text-white">오류가 발생했습니다</h2>
            <p className="text-sm text-slate-400">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-3 text-sm"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <div className="h-full">
      <ErrorBoundary>
        <Page />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(20, 27, 61, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              backdropFilter: "blur(20px)",
            },
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
