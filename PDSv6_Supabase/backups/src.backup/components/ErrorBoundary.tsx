import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  info?: React.ErrorInfo;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging during development
    console.error("Route rendering error:", error, info);
    this.setState({ info });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
    // Force a hard refresh of the current route to recover
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="max-w-xl p-6 border border-border rounded-md bg-card text-card-foreground shadow-sm">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              A runtime error occurred while rendering this page. Please use the actions below.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-muted p-3 rounded mb-4 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2">
              <a href="/admin-dashboard" className="inline-flex items-center px-3 py-2 border rounded">
                Back to Admin Dashboard
              </a>
              <button onClick={this.handleReload} className="inline-flex items-center px-3 py-2 border rounded">
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

