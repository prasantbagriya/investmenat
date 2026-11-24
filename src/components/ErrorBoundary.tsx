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
    // If a chunk failed to fetch (new production deployment has new chunk hashes), automatically reload to get new version
    const isChunkError = error?.message?.includes('dynamically imported module') || 
                         error?.message?.includes('Loading chunk') ||
                         error?.message?.includes('Failed to fetch');
    if (isChunkError) {
      const storageKey = 'last_chunk_reload_ts';
      const lastReload = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
      const now = Date.now();
      if (now - lastReload > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('dynamically imported module') ||
                           this.state.error?.message?.includes('Loading chunk') ||
                           this.state.error?.message?.includes('Failed to fetch');

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200 max-w-md w-full text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {isChunkError ? 'New App Version Available' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              {isChunkError 
                ? 'A new update was deployed to the server. Please reload the app to get the latest features.'
                : 'An unexpected error occurred in this view.'}
            </p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Return Home
              </button>
            </div>
            {this.state.error && !isChunkError && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium">Error Details</summary>
                <pre className="text-[11px] text-rose-600 font-mono bg-rose-50/70 p-2.5 rounded-xl border border-rose-200 mt-2 overflow-auto max-h-28 whitespace-pre-wrap">
                  {this.state.error.message || String(this.state.error)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
