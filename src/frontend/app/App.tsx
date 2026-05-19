import { useEffect, Component, type ReactNode } from "react";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { Router } from "@/frontend/app/Router";
import { Providers } from "@/frontend/app/Providers";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: "12px",
            background: "var(--bg)",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "40px" }}>⚠️</span>
          <h2 style={{ color: "var(--red)", margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
            {this.state.error?.message ?? "An unexpected error occurred"}
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  return <Router />;
}

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppBootstrap />
      </Providers>
    </ErrorBoundary>
  );
}
