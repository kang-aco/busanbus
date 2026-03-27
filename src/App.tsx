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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">앗! 오류가 발생했습니다.</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Page />
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}
