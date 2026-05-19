import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { isAtRisk } from "@/frontend/lib/atRisk";

export function SheetFooter() {
  const payload = usePortfolioStore((s) => s.payload);

  if (!payload) {
    return <footer className="sheet-foot" />;
  }

  const allSubs = payload.projects.flatMap((p) => p.subProjects);
  const total = allSubs.length;
  const shipped = allSubs.filter((s) => s.status === "go_live").length;
  const atRisk = allSubs.filter((s) => isAtRisk(s)).length;
  const avgProgress =
    total > 0
      ? Math.round(allSubs.reduce((a, s) => a + s.progress, 0) / total)
      : 0;

  return (
    <footer className="sheet-foot" role="status">
      <div className="sheet-foot-stat">
        <span className="sheet-foot-value">{total}</span>
        <span>rows</span>
      </div>

      <div className="sheet-foot-stat">
        <span
          className="sheet-foot-dot"
          style={{ background: "var(--green)" }}
        />
        <span className="sheet-foot-value">{shipped}</span>
        <span>shipped</span>
      </div>

      {atRisk > 0 && (
        <div className="sheet-foot-stat">
          <span
            className="sheet-foot-dot"
            style={{ background: "var(--red)" }}
          />
          <span className="sheet-foot-value" style={{ color: "var(--red)" }}>
            {atRisk}
          </span>
          <span>at risk</span>
        </div>
      )}

      <div className="sheet-foot-stat">
        <span className="sheet-foot-value">{avgProgress}%</span>
        <span>avg progress</span>
      </div>
    </footer>
  );
}
