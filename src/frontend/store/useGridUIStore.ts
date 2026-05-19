import { create } from "zustand";

type View = "portfolio" | "calendar" | "reports";

interface SelectedCell {
  subProjectId: string;
  columnId: string;
}

interface OpenPopover {
  kind: string;
  anchorRect: DOMRect;
}

interface PersistedGridUI {
  view: View;
  expandedProjects: Record<string, boolean>;
  columnWidths: Record<string, number>;
}

const STORAGE_KEY = "gridwork.gridUI.v1";
const COL_WIDTHS_KEY = "gridwork.columnWidths.v1";

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  num: 40,
  name: 220,
  lead: 120,
  team: 120,
  status: 120,
  priority: 100,
  due: 100,
  progress: 130,
  tags: 160,
  quarter: 80,
};

function loadPersistedUI(): PersistedGridUI {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedGridUI>;
      return {
        view: (parsed.view as View | undefined) ?? "portfolio",
        expandedProjects: parsed.expandedProjects ?? {},
        columnWidths: parsed.columnWidths ?? { ...DEFAULT_COLUMN_WIDTHS },
      };
    }
  } catch {
    // ignore
  }
  return {
    view: "portfolio",
    expandedProjects: {},
    columnWidths: { ...DEFAULT_COLUMN_WIDTHS },
  };
}

function persistUI(state: PersistedGridUI): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(state.columnWidths));
  } catch {
    // ignore
  }
}

const initial = loadPersistedUI();

interface GridUIState {
  view: View;
  expandedProjects: Record<string, boolean>;
  selectedCell: SelectedCell | null;
  openPopover: OpenPopover | null;
  columnWidths: Record<string, number>;
  setView(v: View): void;
  toggleProject(projectId: string): void;
  selectCell(c: SelectedCell | null): void;
  openPopoverAt(p: OpenPopover): void;
  closePopover(): void;
  setColumnWidth(columnId: string, width: number): void;
}

export const useGridUIStore = create<GridUIState>()((set, get) => ({
  view: initial.view,
  expandedProjects: initial.expandedProjects,
  selectedCell: null,
  openPopover: null,
  columnWidths: initial.columnWidths,

  setView(v) {
    set({ view: v });
    persistUI({
      view: v,
      expandedProjects: get().expandedProjects,
      columnWidths: get().columnWidths,
    });
  },

  toggleProject(projectId) {
    set((state) => {
      const next = {
        ...state.expandedProjects,
        [projectId]: !state.expandedProjects[projectId],
      };
      persistUI({
        view: state.view,
        expandedProjects: next,
        columnWidths: state.columnWidths,
      });
      return { expandedProjects: next };
    });
  },

  selectCell(c) {
    set({ selectedCell: c });
  },

  openPopoverAt(p) {
    set({ openPopover: p });
  },

  closePopover() {
    set({ openPopover: null });
  },

  setColumnWidth(columnId, width) {
    const clamped = Math.max(80, Math.min(400, width));
    set((state) => {
      const next = { ...state.columnWidths, [columnId]: clamped };
      persistUI({
        view: state.view,
        expandedProjects: state.expandedProjects,
        columnWidths: next,
      });
      return { columnWidths: next };
    });
  },
}));

export { DEFAULT_COLUMN_WIDTHS };
