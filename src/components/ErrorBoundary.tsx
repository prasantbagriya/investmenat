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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-rose-200 max-w-md w-full">
            <h2 className="text-xl font-black text-rose-600 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-700 mb-4">
              An unexpected error occurred in this view.
            </p>
            <div className="bg-slate-100 p-3 rounded-lg overflow-x-auto text-xs font-mono text-slate-800 mb-4">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '/'; // Redirect to home on hash router
              }}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
