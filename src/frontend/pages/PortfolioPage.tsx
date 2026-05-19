import { useEffect } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useBoardsStore } from "@/frontend/store/useBoardsStore";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { useGridUIStore } from "@/frontend/store/useGridUIStore";
import { AppBar } from "@/frontend/components/layout/AppBar";
import { Toolbar } from "@/frontend/components/layout/Toolbar";
import { SheetFooter } from "@/frontend/components/layout/SheetFooter";
import { Grid } from "@/frontend/components/grid/Grid";
import { CalendarView } from "@/frontend/components/calendar/CalendarView";
import { ReportsView } from "@/frontend/components/reports/ReportsView";
import { Spinner } from "@/frontend/components/ui/Spinner";
import { ErrorState } from "@/frontend/components/ui/ErrorState";
import { EmptyState } from "@/frontend/components/ui/EmptyState";

interface PortfolioPageProps {
  boardId?: string;
}

export function PortfolioPage({ boardId }: PortfolioPageProps) {
  const profile = useAuthStore((s) => s.profile);
  const boards = useBoardsStore((s) => s.boards);
  const activeBoardId = useBoardsStore((s) => s.activeBoardId);
  const setActiveBoard = useBoardsStore((s) => s.setActiveBoard);

  const load = usePortfolioStore((s) => s.load);
  const refresh = usePortfolioStore((s) => s.refresh);
  const portfolioStatus = usePortfolioStore((s) => s.status);
  const payload = usePortfolioStore((s) => s.payload);
  const errorMessage = usePortfolioStore((s) => s.errorMessage);

  const view = useGridUIStore((s) => s.view);
  const createProject = usePortfolioStore((s) => s.createProject);

  const targetBoardId = boardId ?? activeBoardId ?? boards[0]?.id ?? null;

  useEffect(() => {
    if (boards.length === 0) return;

    if (boardId && boardId !== activeBoardId) {
      setActiveBoard(boardId);
    }

    if (targetBoardId) {
      load(targetBoardId).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBoardId]);

  const readOnly = profile?.role === "viewer";

  function handleCreateProject() {
    if (!targetBoardId) return;
    createProject({
      boardId: targetBoardId,
      name: "New Project",
    }).catch(() => undefined);
  }

  return (
    <div className="app">
      <AppBar />
      <Toolbar />

      <main className="grid-host" role="main">
        {portfolioStatus === "loading" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Spinner size={32} />
          </div>
        )}

        {portfolioStatus === "error" && (
          <ErrorState
            message={errorMessage ?? "Failed to load portfolio"}
            onRetry={() => targetBoardId && refresh()}
          />
        )}

        {portfolioStatus === "ready" && payload && (
          <>
            {view === "portfolio" && (
              <>
                {payload.projects.length === 0 ? (
                  <EmptyState
                    icon="📋"
                    title="No projects yet"
                    body="Create your first project to get started."
                    action={
                      !readOnly ? (
                        <button
                          className="btn btn-primary"
                          onClick={handleCreateProject}
                        >
                          + Create your first project
                        </button>
                      ) : (
                        <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
                          No projects yet.
                        </p>
                      )
                    }
                  />
                ) : (
                  <Grid payload={payload} readOnly={readOnly} />
                )}
              </>
            )}

            {view === "calendar" && (
              <CalendarView payload={payload} readOnly={readOnly} />
            )}

            {view === "reports" && <ReportsView payload={payload} />}
          </>
        )}

        {portfolioStatus === "idle" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--ink-3)",
            }}
          >
            Select a board to get started
          </div>
        )}
      </main>

      <SheetFooter />
    </div>
  );
}
