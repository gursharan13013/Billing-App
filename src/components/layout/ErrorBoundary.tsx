import React, { Component, ErrorInfo, ReactNode } from 'react';


interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-center">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-4 break-words">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Restart App
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
