import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Popover } from "@/frontend/components/cells/Popover";

interface ProgressCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

function progressColor(pct: number): string {
  if (pct >= 70) return "var(--green)";
  if (pct >= 40) return "var(--amber)";
  return "var(--accent)";
}

const HOUR_MS = 24 * 60 * 60 * 1000;

export function ProgressCell({ sub, isEditing, onDoneEditing }: ProgressCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const cellRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [local, setLocal] = useState(sub.progress);

  useEffect(() => {
    setLocal(sub.progress);
  }, [sub.progress]);

  useEffect(() => {
    if (isEditing) {
      setAnchorRect(cellRef.current?.getBoundingClientRect() ?? null);
      setLocal(sub.progress);
    } else {
      setAnchorRect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  function commit() {
    const snapped = Math.round(local / 5) * 5;
    if (snapped !== sub.progress) {
      void patch(sub.id, { progress: snapped });
    }
    onDoneEditing();
  }

  const open = isEditing && anchorRect !== null;

  const showDelta =
    sub.progressUpdatedAt !== null &&
    sub.progressPrev !== null &&
    Date.now() - new Date(sub.progressUpdatedAt).getTime() < HOUR_MS &&
    sub.progress !== sub.progressPrev;

  const delta = sub.progressPrev !== null ? sub.progress - sub.progressPrev : 0;

  return (
    <div ref={cellRef} className="progress-bar-wrapper">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${sub.progress}%`,
            background: progressColor(sub.progress),
          }}
        />
      </div>
      <span className="progress-pct">{sub.progress}%</span>
      {showDelta && (
        <span className={`progress-delta ${delta >= 0 ? "up" : "down"}`}>
          {delta >= 0 ? "▲" : "▼"}
        </span>
      )}
      {open && (
        <Popover anchorRect={anchorRect} onClose={commit} minWidth={200}>
          <div className="progress-editor">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={local}
              onChange={(e) => setLocal(Number(e.target.value))}
              onMouseUp={commit}
              autoFocus
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={local}
                onChange={(e) => setLocal(Math.max(0, Math.min(100, Number(e.target.value))))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") onDoneEditing();
                }}
              />
              <span style={{ fontSize: "13px", color: "var(--ink-3)" }}>%</span>
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}
