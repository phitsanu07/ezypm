import { create } from "zustand";
import type { TagFilter, StatusFilter } from "@/frontend/lib/projectFilter";

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

// Columns temporarily hidden from the grid. Remove an id here to bring the
// column back — header, body cells and the grid template all read from this.
const HIDDEN_COLUMNS = new Set<string>(["due"]);

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  num: 40,
  name: 220,
  lead: 120,
  team: 120,
  status: 168,
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
  tagFilter: TagFilter;
  statusFilter: StatusFilter;
  setTagFilter(f: TagFilter): void;
  setStatusFilter(f: StatusFilter): void;
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
  tagFilter: "all",
  statusFilter: "all",

  setTagFilter(f) {
    set({ tagFilter: f });
  },

  setStatusFilter(f) {
    set({ statusFilter: f });
  },

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

export { DEFAULT_COLUMN_WIDTHS, HIDDEN_COLUMNS };
