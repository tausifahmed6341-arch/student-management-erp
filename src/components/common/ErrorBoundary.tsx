import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error in ERP Frontend:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div id="erp_error_boundary" className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">View Render Issue</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {this.state.error?.message || 'An unexpected rendering error occurred in this view module.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reset & Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
