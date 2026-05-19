import { useGridUIStore } from "@/frontend/store/useGridUIStore";

type View = "portfolio" | "calendar" | "reports";

const VIEWS: { id: View; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "calendar", label: "Calendar" },
  { id: "reports", label: "Reports" },
];

export function ViewSwitcher() {
  const view = useGridUIStore((s) => s.view);
  const setView = useGridUIStore((s) => s.setView);

  return (
    <div className="view-toggle" role="tablist" aria-label="View selector">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          className={`view-toggle-btn${view === v.id ? " active" : ""}`}
          role="tab"
          aria-selected={view === v.id}
          onClick={() => setView(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
