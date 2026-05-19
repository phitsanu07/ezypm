interface ChipProps {
  label: string;
  bg: string;
  fg: string;
  dot?: string;
  size?: "sm" | "md";
}

export function Chip({ label, bg, fg, dot, size = "md" }: ChipProps) {
  return (
    <span
      className="chip"
      style={{
        background: bg,
        color: fg,
        fontSize: size === "sm" ? "10.5px" : "11.5px",
      }}
    >
      {dot && (
        <span className="chip-dot" style={{ background: dot }} />
      )}
      {label}
    </span>
  );
}
