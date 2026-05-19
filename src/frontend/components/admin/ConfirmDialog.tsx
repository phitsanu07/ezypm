import { Modal } from "@/frontend/components/ui/Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm(): void;
  onCancel(): void;
  dangerous?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  dangerous = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn btn-sm ${dangerous ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: "13.5px", color: "var(--ink-2)", margin: 0 }}>
        {message}
      </p>
    </Modal>
  );
}
