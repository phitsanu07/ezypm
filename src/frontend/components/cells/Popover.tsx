import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  anchorRect: DOMRect;
  onClose(): void;
  children: ReactNode;
  minWidth?: number;
}

const GAP = 4;
const MARGIN = 8;

export function Popover({ anchorRect, onClose, children, minWidth = 180 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number | undefined;
    visible: boolean;
  }>({
    top: anchorRect.bottom + GAP,
    left: anchorRect.left,
    maxHeight: undefined,
    visible: false,
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - anchorRect.bottom - GAP - MARGIN;
    const spaceAbove = anchorRect.top - GAP - MARGIN;
    const desired = rect.height;

    let top: number;
    let maxHeight: number | undefined;

    if (desired <= spaceBelow) {
      top = anchorRect.bottom + GAP;
      maxHeight = undefined;
    } else if (desired <= spaceAbove) {
      top = anchorRect.top - GAP - desired;
      maxHeight = undefined;
    } else if (spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + GAP;
      maxHeight = Math.max(120, spaceBelow);
    } else {
      maxHeight = Math.max(120, spaceAbove);
      top = anchorRect.top - GAP - maxHeight;
    }

    let left = anchorRect.left;
    if (left + rect.width + MARGIN > vw) {
      left = Math.max(MARGIN, vw - rect.width - MARGIN);
    }

    setPos({ top, left, maxHeight, visible: true });
  }, [anchorRect]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div
        ref={ref}
        className="popover"
        style={{
          top: pos.top,
          left: pos.left,
          minWidth,
          ...(pos.maxHeight !== undefined ? { maxHeight: pos.maxHeight } : {}),
          visibility: pos.visible ? "visible" : "hidden",
        }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
