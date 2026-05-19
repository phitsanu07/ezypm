interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        gap: "12px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "36px" }}>⚠️</span>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--red)", margin: 0 }}>
        {message}
      </p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          ↻ ลองใหม่ / Retry
        </button>
      )}
    </div>
  );
}
