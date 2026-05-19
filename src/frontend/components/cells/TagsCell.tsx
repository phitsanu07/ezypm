import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations } from "@/types";
import { TAG_COLORS, DEFAULT_TAG_COLOR } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Chip } from "@/frontend/components/ui/Chip";
import { Popover } from "@/frontend/components/cells/Popover";

interface TagsCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function TagsCell({ sub, isEditing, onDoneEditing }: TagsCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const cellRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [localTags, setLocalTags] = useState<string[]>(sub.tags);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (isEditing) {
      setAnchorRect(cellRef.current?.getBoundingClientRect() ?? null);
      setLocalTags(sub.tags);
      setInput("");
    } else {
      setAnchorRect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  function commitTags(tags: string[]) {
    void patch(sub.id, { tags });
    onDoneEditing();
  }

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || localTags.includes(trimmed)) return;
    const next = [...localTags, trimmed];
    setLocalTags(next);
    setInput("");
  }

  function removeTag(tag: string) {
    setLocalTags(localTags.filter((t) => t !== tag));
  }

  const knownTags = Object.keys(TAG_COLORS);
  const suggestions = input
    ? knownTags.filter(
        (t) => t.includes(input.toLowerCase()) && !localTags.includes(t)
      )
    : knownTags.filter((t) => !localTags.includes(t)).slice(0, 8);

  const visible = sub.tags.slice(0, 3);
  const extra = sub.tags.length - 3;

  return (
    <div ref={cellRef} className="tags-cell">
      {visible.map((tag) => {
        const colors = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
        return (
          <Chip key={tag} label={tag} bg={colors.bg} fg={colors.fg} size="sm" />
        );
      })}
      {extra > 0 && (
        <span
          style={{
            fontSize: "10.5px",
            color: "var(--ink-3)",
            fontWeight: 600,
          }}
        >
          +{extra}
        </span>
      )}
      {sub.tags.length === 0 && (
        <span style={{ color: "var(--ink-3)", fontSize: "12px" }}>—</span>
      )}
      {isEditing && anchorRect !== null && (
        <Popover anchorRect={anchorRect} onClose={() => commitTags(localTags)} minWidth={240}>
          <div className="tag-editor">
            <div className="tag-editor-input-row">
              {localTags.map((tag) => {
                const colors = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
                return (
                  <span
                    key={tag}
                    className="chip"
                    style={{
                      background: colors.bg,
                      color: colors.fg,
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                    onClick={() => removeTag(tag)}
                  >
                    {tag} <span style={{ opacity: 0.6 }}>✕</span>
                  </span>
                );
              })}
              <input
                className="tag-editor-input"
                autoFocus
                placeholder="tag…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(input);
                  } else if (e.key === "Backspace" && !input && localTags.length > 0) {
                    const last = localTags[localTags.length - 1];
                    if (last) removeTag(last);
                  } else if (e.key === "Escape") {
                    commitTags(localTags);
                  }
                }}
              />
            </div>
            <div className="tag-editor-suggestions">
              {suggestions.map((tag) => {
                const colors = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
                return (
                  <button
                    key={tag}
                    className="popover-item"
                    onClick={() => addTag(tag)}
                  >
                    <Chip label={tag} bg={colors.bg} fg={colors.fg} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}
