import { useEffect } from "react";
import { useToastStore } from "@/frontend/store/useToastStore";

const TONE_STYLES: Record<string, { bg: string; fg: string; icon: string }> = {
  info: { bg: "#E4EEFF", fg: "#1A56C5", icon: "ℹ" },
  success: { bg: "#D7F1E3", fg: "#1F6B45", icon: "✓" },
  error: { bg: "#FFE0E1", fg: "#A1262A", icon: "✕" },
};

interface ToastItemProps {
  id: string;
  tone: string;
  message: string;
}

function ToastItem({ id, tone, message }: ToastItemProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  const style = TONE_STYLES[tone] ?? TONE_STYLES["info"]!;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: style.bg,
        color: style.fg,
        border: `1px solid ${style.fg}33`,
        borderRadius: "9px",
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
        fontSize: "13px",
        fontWeight: 500,
        minWidth: "260px",
        maxWidth: "400px",
        animation: "slideIn 0.2s ease",
      }}
      role="status"
    >
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{style.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => dismiss(id)}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: 0,
          cursor: "pointer",
          color: style.fg,
          opacity: 0.7,
          fontSize: "14px",
          padding: "0 2px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const items = useToastStore((s) => s.items);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999,
      }}
    >
      <style>{`@keyframes slideIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      {items.map((item) => (
        <ToastItem key={item.id} {...item} />
      ))}
    </div>
  );
}
