import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "📋", title, body, action }: EmptyStateProps) {
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
      <span style={{ fontSize: "40px" }}>{icon}</span>
      <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
        {title}
      </p>
      {body && (
        <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: 0, maxWidth: "320px" }}>
          {body}
        </p>
      )}
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </div>
  );
}
