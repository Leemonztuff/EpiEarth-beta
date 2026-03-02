import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.ui.error(`[ErrorBoundary] ${error.message}`, errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-[9999]">
          <div className="flex flex-col items-center gap-4 p-8 bg-slate-900 rounded-lg border border-red-900 max-w-md">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-white">Algo salió mal</h2>
            <p className="text-slate-400 text-sm text-center">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
