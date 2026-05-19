import { useEffect, useRef, type ReactNode } from "react";

interface PopoverProps {
  anchorRect: DOMRect;
  onClose(): void;
  children: ReactNode;
  minWidth?: number;
}

export function Popover({ anchorRect, onClose, children, minWidth = 180 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div
        ref={ref}
        className="popover"
        style={{ top, left, minWidth }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  );
}
