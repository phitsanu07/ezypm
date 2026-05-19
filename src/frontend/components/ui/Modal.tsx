import { useEffect, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose(): void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  actions?: ReactNode;
}

export function Modal({
  title,
  onClose,
  children,
  size = "md",
  actions,
}: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`modal${size === "sm" ? " modal-sm" : size === "lg" ? " modal-lg" : ""}`}>
        <h2 className="modal-title">{title}</h2>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
