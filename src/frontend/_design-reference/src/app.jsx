// App shell: portfolio (project → sub-project as rows, no task breakdown)
const { useState, useEffect, useMemo } = React;

function buildInitialProjects(boardId) {
  // Try persisted first
  const persisted = window.Boards.loadProjects(boardId);
  if (persisted) return persisted;
  // Else seed from defaults for this board
  return window.Boards.getSeedProjects(boardId).map(p => ({
    ...p,
    subProjects: p.subProjects.map(sp => ({ ...sp })),
  }));
}

function App() {
  const me = window.Auth.requireAuth();
  if (!me) return null;
  const readOnly = me.role === "viewer";

  const boards = window.Boards.getBoardsForUser(me);
  if (boards.length === 0) {
    return <NoBoardAccess user={me} />;
  }

  const initialBoardId = window.Boards.resolveBoardForUser(me);
  const [boardId, setBoardId] = useState(initialBoardId);
  const currentBoard = boards.find(b => b.id === boardId) || boards[0];

  const history = useHistory({ projects: buildInitialProjects(boardId) });
  const { state, apply, undo, redo } = history;

  // Persist projects to localStorage whenever they change
  useEffect(() => {
    window.Boards.saveProjects(boardId, state.projects);
  }, [state.projects, boardId]);

  // When switching board, reload
  function switchBoard(newId) {
    window.Boards.saveProjects(boardId, state.projects);
    window.Boards.setCurrentBoardId(newId);
    setBoardId(newId);
    // Re-init history state for new board
    apply(() => ({ projects: buildInitialProjects(newId) }));
  }

  const [projectExpanded, setProjectExpanded] = useState({ retail: true, internal: true, infra: true });

  const firstRowId = state.projects[0]?.subProjects[0]?.id;
  const [activeCell, setActiveCell] = useState({ rowId: firstRowId, col: "name" });
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState(null); // { col, dir }

  const STATUS_ORDER_VAL = { requirement: 0, spec: 1, dev: 2, test: 3, uat: 4, go_live: 5 };
  const PRIORITY_ORDER_VAL = { p1: 0, p2: 1, p3: 2, p4: 3 };

  // Aggregate values for a parent project from its sub-projects (used for sorting)
  function projectAgg(p, col) {
    const subs = p.subProjects;
    if (subs.length === 0) return null;
    switch (col) {
      case "name":     return (p.name || "").toLowerCase();
      case "status":   return Math.min(...subs.map(s => STATUS_ORDER_VAL[s.status] ?? 99));
      case "priority": return Math.min(...subs.map(s => PRIORITY_ORDER_VAL[s.priority] ?? 99));
      case "progress": return subs.reduce((a, s) => a + s.progress, 0) / subs.length;
      case "due":      return subs.reduce((m, s) => (s.due && (!m || s.due < m)) ? s.due : m, null) || "9999";
      case "quarter":  return subs.reduce((m, s) => (s.quarter && (!m || s.quarter < m)) ? s.quarter : m, null) || "ZZ";
      case "lead":     return (window.PEOPLE[subs[0]?.lead]?.name || "").toLowerCase();
      default: return null;
    }
  }

  // Sort top-level projects (group containers), not sub-projects within them
  const sortedProjects = useMemo(() => {
    if (!sort) return state.projects;
    const cmp = (a, b) => {
      const av = projectAgg(a, sort.col);
      const bv = projectAgg(b, sort.col);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ?  1 : -1;
      return 0;
    };
    return [...state.projects].sort(cmp);
  }, [state.projects, sort]);

  // rowId (= subProject id) → context
  const rowIndex = useMemo(() => {
    const m = new Map();
    state.projects.forEach(p => p.subProjects.forEach(sp => {
      m.set(sp.id, { projectId: p.id, project: p, sub: sp });
    }));
    return m;
  }, [state.projects]);

  const groups = useMemo(() => {
    return sortedProjects.map(p => ({ projectId: p.id, project: p, subs: p.subProjects }));
  }, [sortedProjects]);

  function updateSubs(projectId, updater) {
    apply((s) => ({
      ...s,
      projects: s.projects.map(p => p.id !== projectId ? p :
        ({ ...p, subProjects: typeof updater === "function" ? updater(p.subProjects) : updater })
      )
    }));
  }
  // Auto-progress mapping by SDLC status
  const STATUS_PROGRESS = { requirement: 10, spec: 25, dev: 50, test: 70, uat: 85, go_live: 100 };
  const STATUS_ORDER = ["requirement","spec","dev","test","uat","go_live"];
  function updateCell(projectId, subId, col, val) {
    updateSubs(projectId, subs => subs.map(s => {
      if (s.id !== subId) return s;
      const next = { ...s, [col]: val };
      if (col === "status") {
        const target = STATUS_PROGRESS[val];
        const prevTarget = STATUS_PROGRESS[s.status];
        // Snap when crossing into a higher band, or when at the previous canonical value
        if (s.progress === prevTarget || target === 100 ||
            (target !== undefined && Math.abs(s.progress - target) > 20)) {
          next.progress = target;
        }
      }
      if (col === "progress") {
        // Reverse-derive status from progress
        let derived = s.status;
        if (val >= 100) derived = "go_live";
        else if (val >= 80) derived = "uat";
        else if (val >= 60) derived = "test";
        else if (val >= 35) derived = "dev";
        else if (val >= 15) derived = "spec";
        else derived = "requirement";
        next.status = derived;
      }
      return next;
    }));
  }
  function addSub(projectId) {
    const newId = "sp" + Math.random().toString(36).slice(2, 7);
    updateSubs(projectId, subs => [...subs, {
      id: newId, name: "", nameTh: "", icon: "◐",
      lead: "anan", team: ["anan"],
      status: "planning", priority: "p3",
      due: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
      progress: 0, quarter: "Q3-26", tags: [],
    }]);
    setProjectExpanded(e => ({ ...e, [projectId]: true }));
    setTimeout(() => setActiveCell({ rowId: newId, col: "name" }), 30);
  }
  function deleteSub(projectId, subId) {
    updateSubs(projectId, subs => subs.filter(s => s.id !== subId));
  }
  function reorderSub(subId, target) {
    const src = rowIndex.get(subId);
    if (!src) return;
    apply((s) => {
      const projects = s.projects.map(p => ({ ...p, subProjects: [...p.subProjects] }));
      const srcP = projects.find(p => p.id === src.projectId);
      const srcIdx = srcP.subProjects.findIndex(sp => sp.id === subId);
      const [moved] = srcP.subProjects.splice(srcIdx, 1);
      const dstP = projects.find(p => p.id === target.projectId);
      let dstIdx = Math.min(target.idxInGroup, dstP.subProjects.length);
      if (src.projectId === target.projectId && srcIdx < dstIdx) dstIdx -= 1;
      dstP.subProjects.splice(dstIdx, 0, moved);
      return { ...s, projects };
    });
  }

  function toggleProject(id) { setProjectExpanded(e => ({ ...e, [id]: !e[id] })); }
  function expandAll() {
    const next = {};
    state.projects.forEach(p => { next[p.id] = true; });
    setProjectExpanded(next);
  }
  function collapseAll() {
    const next = {};
    state.projects.forEach(p => { next[p.id] = false; });
    setProjectExpanded(next);
  }
  function renameProject(id, name, nameTh) {
    apply((s) => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, name, nameTh } : p) }));
  }
  function setProjectType(id, type) {
    apply((s) => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, type } : p) }));
  }

  const PROJECT_COLORS = ["#7C5CFF","#3DBE8B","#FF7849","#3A86FF","#E5484D","#F4A300","#9A1F66"];
  const PROJECT_ICONS = ["▦","⌘","◈","◆","▲","●","◉"];
  function addProject() {
    const newId = "p" + Math.random().toString(36).slice(2, 7);
    const idx = state.projects.length;
    const newSubId = "sp" + Math.random().toString(36).slice(2, 7);
    apply((s) => ({
      ...s,
      projects: [...s.projects, {
        id: newId,
        name: "New Project",
        nameTh: "",
        type: "year_plan",
        icon: PROJECT_ICONS[idx % PROJECT_ICONS.length],
        color: PROJECT_COLORS[idx % PROJECT_COLORS.length],
        subProjects: [{
          id: newSubId, name: "", nameTh: "", icon: "◐",
          lead: "anan", team: ["anan"],
          status: "requirement", priority: "p3",
          due: new Date(Date.now() + 60*86400000).toISOString().slice(0,10),
          progress: 10, quarter: "Q3-26", tags: [],
        }],
      }],
    }));
    setProjectExpanded(e => ({ ...e, [newId]: true }));
    setTimeout(() => setActiveCell({ rowId: newSubId, col: "name" }), 30);
  }

  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (mod && e.key === "Enter") {
        e.preventDefault();
        const cur = rowIndex.get(activeCell.rowId);
        if (cur) addSub(cur.projectId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stats = useMemo(() => {
    let subs = 0, shipped = 0, risk = 0, progressSum = 0;
    state.projects.forEach(p => p.subProjects.forEach(s => {
      subs++;
      if (s.status === "done") shipped++;
      if (s.status === "blocked") risk++;
      progressSum += s.progress;
    }));
    return { subs, shipped, risk, avgProgress: subs ? Math.round(progressSum / subs) : 0 };
  }, [state.projects]);

  const idx = rowIndex.get(activeCell.rowId);
  const cellRef = (() => {
    if (!idx) return "—";
    const letter = COLUMNS.find(c => c.key === activeCell.col)?.letter || "?";
    const rowNum = idx.project.subProjects.findIndex(s => s.id === activeCell.rowId) + 1;
    return `${idx.project.id.toUpperCase().slice(0,3)} · ${letter}${rowNum}`;
  })();
  const cellValue = (() => {
    if (!idx) return "";
    const s = idx.sub, v = s[activeCell.col];
    if (activeCell.col === "name") return s.name + "  ·  " + s.nameTh;
    if (activeCell.col === "status")   return window.STATUS_OPTIONS.find(o => o.id === v)?.label || v;
    if (activeCell.col === "priority") return window.PRIORITY_OPTIONS.find(o => o.id === v)?.label || v;
    if (activeCell.col === "lead")     return window.PEOPLE[v]?.name || v;
    if (activeCell.col === "team")     return (v || []).map(id => window.PEOPLE[id]?.name).filter(Boolean).join(", ");
    if (activeCell.col === "tags")     return Array.isArray(v) ? v.join(", ") : "";
    if (activeCell.col === "progress") return v + "%";
    return v || "";
  })();

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-left">
          <div className="logo">
            <span className="logo-mark">▦</span>
            <span className="logo-name">GridWork</span>
          </div>
          <BoardSwitcher boards={boards} currentBoard={currentBoard} onSelect={switchBoard} isAdmin={me.role === "admin"} />
        </div>
        <div className="appbar-right">
          <div className="search">
            <span className="search-icon">⌕</span>
            <input
              placeholder="ค้นหา sub-project / tag / คน…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span className="search-kbd"><kbd>⌘K</kbd></span>
          </div>
          <UserMenu currentUser={me} onLogout={() => { window.Auth.clearSession(); window.location.href = "login.html"; }} />
        </div>
      </header>

      <div className="toolbar">
        <div className="view-tabs">
          <button className="view-tab active"><span className="view-icon">▦</span> Portfolio <span className="view-th">ภาพรวม</span></button>
          <button className="view-add" title="เพิ่ม view">+</button>
        </div>
        <div className="tool-actions">
          <button className="tool-btn" onClick={undo} title="Undo (⌘Z)"><span className="ti">↶</span> Undo</button>
          <button className="tool-btn" onClick={redo} title="Redo (⌘⇧Z)"><span className="ti">↷</span> Redo</button>
          <span className="tool-sep" />
          <button className="tool-btn"><span className="ti">⌖</span> Filter</button>
          <button className={"tool-btn " + (sort ? "active-sort" : "")}
                  onClick={() => setSort(null)}
                  title={sort ? "ล้างการเรียง" : "คลิกที่หัวคอลัมน์เพื่อเรียง"}>
            <span className="ti">⇅</span>
            {sort ? <>เรียงตาม <b style={{ marginLeft: 4 }}>{COLUMNS.find(c => c.key === sort.col)?.label} {sort.dir === "asc" ? "↑" : "↓"}</b> <span style={{ marginLeft: 4, opacity: 0.6 }}>×</span></> : "Sort"}
          </button>
          <span className="tool-sep" />
          <button className="tool-btn-cta" onClick={addProject}>
            <span className="cta-plus">+</span>
            <span className="cta-text">New Project</span>
            <span className="cta-sub">โปรเจกต์ใหม่</span>
          </button>
        </div>
      </div>

      <main className="grid-host">
        <Grid
          groups={groups}
          projectExpanded={projectExpanded}
          onUpdate={updateCell}
          onAddSub={addSub}
          onDeleteSub={deleteSub}
          onReorder={reorderSub}
          onToggleProject={toggleProject}
          onRenameProject={renameProject}
          onSetProjectType={setProjectType}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          sort={sort}
          setSort={setSort}
          activeCell={activeCell}
          setActiveCell={setActiveCell}
          editing={editing}
          setEditing={setEditing}
          filter={filter}
        />
      </main>

      <footer className="sheet-foot">
        <div className="foot-stats">
          <span className="stat"><span className="stat-lbl">Sub-projects</span><span className="stat-val">{stats.subs}</span></span>
          <span className="stat"><span className="stat-lbl">Shipped</span><span className="stat-val good">{stats.shipped}</span></span>
          <span className="stat"><span className="stat-lbl">At risk</span><span className="stat-val bad">{stats.risk}</span></span>
          <span className="stat"><span className="stat-lbl">Avg progress</span><span className="stat-val">{stats.avgProgress}%</span></span>
          <span className="auto-save"><span className="auto-dot" />บันทึกอัตโนมัติ</span>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
