interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 20, color = "var(--accent)" }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      style={{ animation: "spin 0.75s linear infinite", display: "block" }}
      aria-label="Loading"
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.2"
      />
      <path
        d="M10 2 a8 8 0 0 1 8 8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
