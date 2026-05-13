// Portfolio grid: sub-projects are the rows
const { useState, useRef, useEffect, useMemo, useCallback } = React;

const COLUMNS = [
  { key: "name",     letter: "A", label: "Project",     labelTh: "โปรเจกต์",        width: 320, type: "name" },
  { key: "lead",     letter: "B", label: "Lead",        labelTh: "หัวหน้า",         width: 170, type: "assignee" },
  { key: "team",     letter: "C", label: "Team",        labelTh: "ทีม",              width: 140, type: "team" },
  { key: "status",   letter: "D", label: "Status",      labelTh: "สถานะ",           width: 150, type: "status" },
  { key: "priority", letter: "E", label: "Priority",    labelTh: "ความสำคัญ",      width: 130, type: "priority" },
  { key: "due",      letter: "F", label: "Target",      labelTh: "กำหนดส่ง",        width: 150, type: "date" },
  { key: "progress", letter: "G", label: "Progress",    labelTh: "ความคืบหน้า",    width: 170, type: "progress" },
  { key: "quarter",  letter: "H", label: "Quarter",     labelTh: "ไตรมาส",           width: 90,  type: "text-mono" },
  { key: "tags",     letter: "I", label: "Tags",        labelTh: "ป้าย",              width: 200, type: "tags" },
];

function useHistory(initial) {
  const [state, setState] = useState(initial);
  const past = useRef([]); const future = useRef([]);
  const apply = useCallback((updater) => {
    setState((prev) => {
      past.current.push(prev); future.current = [];
      if (past.current.length > 50) past.current.shift();
      return typeof updater === "function" ? updater(prev) : updater;
    });
  }, []);
  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    setState((prev) => { const last = past.current.pop(); future.current.push(prev); return last; });
  }, []);
  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    setState((prev) => { const next = future.current.pop(); past.current.push(prev); return next; });
  }, []);
  return { state, apply, undo, redo };
}

// Team cell: multi-avatar stack with click-to-edit popover
function TeamCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const ref = useRef(null);
  const ids = value || [];
  return (
    <div className="cell-inner team-cell" onClick={onStartEdit}>
      <span ref={ref} className="team-stack">
        {ids.length === 0 && <span className="ph">— ยังไม่มี</span>}
        {ids.slice(0, 4).map((id, i) => {
          const p = window.PEOPLE[id]; if (!p) return null;
          return <span key={id} className="avatar avatar-stack" style={{ background: p.color, zIndex: 10 - i }}>{p.initials}</span>;
        })}
        {ids.length > 4 && <span className="avatar avatar-stack more">+{ids.length - 4}</span>}
      </span>
      {editing && (
        <Popover anchorRef={ref} onClose={onStopEdit}>
          <div className="pop-list">
            <div className="pop-head">เลือกสมาชิกทีม</div>
            {Object.entries(window.PEOPLE).map(([id, p]) => {
              const active = ids.includes(id);
              return (
                <button key={id} className="pop-item" onClick={() => {
                  onChange(active ? ids.filter(x => x !== id) : [...ids, id]);
                }}>
                  <span className="assignee">
                    <span className="avatar" style={{ background: p.color, opacity: active ? 1 : 0.4 }}>{p.initials}</span>
                    <span className="assignee-name">{p.name}</span>
                  </span>
                  <span className="pop-th">{active ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </Popover>
      )}
    </div>
  );
}

function Grid({ groups, onUpdate, onAddSub, onDeleteSub, onReorder, onToggleProject, onRenameProject, onSetProjectType, onExpandAll, onCollapseAll, sort, setSort,
                activeCell, setActiveCell, editing, setEditing, filter, projectExpanded }) {

  // Flat row list for keyboard nav across project blocks
  const flatRows = useMemo(() => {
    const out = [];
    groups.forEach(g => {
      if (!projectExpanded[g.projectId]) return;
      g.subs.forEach(s => out.push({ ...s, projectId: g.projectId }));
    });
    return out;
  }, [groups, projectExpanded]);

  const filteredRowIds = useMemo(() => {
    if (!filter) return null;
    const q = filter.toLowerCase();
    const ids = new Set();
    flatRows.forEach(s => {
      if ((s.name || "").toLowerCase().includes(q) ||
          (s.nameTh || "").toLowerCase().includes(q) ||
          (s.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (s.lead || "").toLowerCase().includes(q)) ids.add(s.id);
    });
    return ids;
  }, [filter, flatRows]);

  const [hoverRow, setHoverRow] = useState(null);
  const [dragRow, setDragRow] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [editProjId, setEditProjId] = useState(null);
  const [editProjEn, setEditProjEn] = useState("");
  const [editProjTh, setEditProjTh] = useState("");

  function startProjEdit(p) {
    setEditProjId(p.id);
    setEditProjEn(p.name);
    setEditProjTh(p.nameTh);
  }
  function commitProjEdit(p) {
    onRenameProject(p.id, editProjEn.trim() || p.name, editProjTh.trim());
    setEditProjId(null);
  }

  function startEdit(rowId, col) { setActiveCell({ rowId, col }); setEditing(true); }

  function moveActive(dx, dy) {
    if (!activeCell) return;
    const r = flatRows.findIndex(x => x.id === activeCell.rowId);
    const c = COLUMNS.findIndex(x => x.key === activeCell.col);
    if (r < 0) return;
    const nr = Math.max(0, Math.min(flatRows.length - 1, r + dy));
    const nc = Math.max(0, Math.min(COLUMNS.length - 1, c + dx));
    setActiveCell({ rowId: flatRows[nr].id, col: COLUMNS[nc].key });
  }

  useEffect(() => {
    function onKey(e) {
      if (editing) return;
      if (!activeCell) return;
      if (document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
      if (e.key === "ArrowUp")    { e.preventDefault(); moveActive(0, -1); }
      else if (e.key === "ArrowDown")  { e.preventDefault(); moveActive(0,  1); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); moveActive(-1, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); moveActive(1,  0); }
      else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); setEditing(true); }
      else if (e.key === "Tab")        { e.preventDefault(); moveActive(e.shiftKey ? -1 : 1, 0); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onRowDragStart(rowId) { setDragRow(rowId); }
  function onRowDragOver(e, target) { e.preventDefault(); setDropTarget(target); }
  function onRowDragEnd() {
    if (dragRow && dropTarget) onReorder(dragRow, dropTarget);
    setDragRow(null); setDropTarget(null);
  }

  const gridTemplate = "44px " + COLUMNS.map(c => c.width + "px").join(" ");
  let runningRowNum = 0;

  function renderSubRow(sub, group, idxInGroup) {
    if (filteredRowIds && !filteredRowIds.has(sub.id)) return null;
    runningRowNum += 1;
    const target = { projectId: group.projectId, idxInGroup };
    const isDrop = dropTarget && dropTarget.projectId === target.projectId && dropTarget.idxInGroup === target.idxInGroup;
    return (
      <div key={sub.id}
        className={"grid-row data-row " +
          (hoverRow === sub.id ? "hover " : "") +
          (dragRow === sub.id ? "dragging " : "") +
          (isDrop && dragRow !== sub.id ? "drop-target " : "")
        }
        onMouseEnter={() => setHoverRow(sub.id)}
        onMouseLeave={() => setHoverRow(null)}
        onDragOver={(e) => onRowDragOver(e, target)}
      >
        <div className="cell row-num">
          <span className="row-handle"
            draggable
            onDragStart={() => onRowDragStart(sub.id)}
            onDragEnd={onRowDragEnd}
            title="ลากเพื่อย้าย">⋮⋮</span>
          <span className="row-idx">{runningRowNum}</span>
          {hoverRow === sub.id && (
            <button className="row-del" onClick={() => onDeleteSub(group.projectId, sub.id)} title="ลบ">×</button>
          )}
        </div>
        {COLUMNS.map(col => {
          const active = activeCell && activeCell.rowId === sub.id && activeCell.col === col.key;
          const isEditing = active && editing;
          const cellProps = {
            editing: isEditing,
            onStartEdit: () => startEdit(sub.id, col.key),
            onStopEdit: () => setEditing(false),
            onChange: (v) => onUpdate(group.projectId, sub.id, col.key, v),
          };
          return (
            <div key={col.key}
                 className={"cell data-cell " + (active ? "active " : "")}
                 onClick={() => setActiveCell({ rowId: sub.id, col: col.key })}>
              {col.type === "name" && (
                <div className="task-cell" onDoubleClick={() => startEdit(sub.id, "name")}>
                  {isEditing
                    ? <TextCell value={sub.name} {...cellProps} placeholder="ชื่อ sub-project…" />
                    : (<>
                        <div className="task-en">
                          <span className="sub-row-icon" style={{ color: group.project.color }}>{sub.icon}</span>
                          {sub.name || <span className="ph">ไม่มีชื่อ</span>}
                        </div>
                        <div className="task-th">{sub.nameTh}</div>
                      </>)}
                </div>
              )}
              {col.type === "assignee" && <AssigneeCell value={sub.lead} {...cellProps} />}
              {col.type === "team"     && <TeamCell     value={sub.team} {...cellProps} />}
              {col.type === "status"   && <StatusCell   value={sub.status}   {...cellProps} />}
              {col.type === "priority" && <PriorityCell value={sub.priority} {...cellProps} />}
              {col.type === "date"     && <DateCell     value={sub.due}      {...cellProps} />}
              {col.type === "progress" && <ProgressCell value={sub.progress} {...cellProps} />}
              {col.type === "tags"     && <TagsCell     value={sub.tags}     {...cellProps} />}
              {col.type === "text-mono" && <TextCell value={sub.quarter} {...cellProps} mono placeholder="—" />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid-scroll">
      <div className="grid" style={{ "--grid-cols": gridTemplate }}>
        <div className="grid-row hdr-letters">
          <div className="cell hdr-corner">
            <button className="hdr-corner-btn" onClick={onExpandAll} title="ขยายทั้งหมด">⊞</button>
            <button className="hdr-corner-btn" onClick={onCollapseAll} title="ย่อทั้งหมด">⊟</button>
          </div>
          {COLUMNS.map(c => <div key={c.key} className="cell hdr-letter">{c.letter}</div>)}
        </div>
        <div className="grid-row hdr-names">
          <div className="cell hdr-corner"></div>
          {COLUMNS.map(c => {
            const sorted = sort && sort.col === c.key;
            const sortable = ["name","status","priority","progress","due","quarter","lead"].includes(c.key);
            return (
              <div key={c.key}
                   className={"cell hdr-name " + (sortable ? "sortable " : "") + (sorted ? "sorted" : "")}
                   onClick={() => {
                     if (!sortable) return;
                     if (!sort || sort.col !== c.key) setSort({ col: c.key, dir: "asc" });
                     else if (sort.dir === "asc") setSort({ col: c.key, dir: "desc" });
                     else setSort(null);
                   }}
                   title={sortable ? "คลิกเพื่อเรียง (asc / desc / off)" : undefined}
              >
                <span className="hdr-name-en">{c.label}</span>
                {sortable && (
                  <span className={"hdr-sort " + (sorted ? "active " + sort.dir : "")}>
                    {sorted ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {groups.map(group => {
          const { project, subs } = group;
          const projOpen = !!projectExpanded[project.id];
          const total = subs.length;
          const shipped = subs.filter(s => s.status === "done").length;
          const risk = subs.filter(s => s.status === "blocked").length;
          const avgPct = total ? Math.round(subs.reduce((a, s) => a + s.progress, 0) / total) : 0;
          return (
            <React.Fragment key={project.id}>
              <div className="grid-row proj-header" style={{ "--proj-color": project.color }}
                   onClick={() => onToggleProject(project.id)}>
                <div className="cell proj-h-num">
                  <span className={"proj-h-chev " + (projOpen ? "open" : "")}>›</span>
                </div>
                <div className="cell proj-h-body" style={{ gridColumn: "2 / -1" }}>
                  <span className="proj-h-icon" style={{ background: project.color }}>{project.icon}</span>
                  <span className="proj-h-name" onClick={(e) => e.stopPropagation()}>
                    {editProjId === project.id ? (
                      <span className="proj-h-name-edit">
                        <input
                          autoFocus
                          className="proj-h-input en"
                          value={editProjEn}
                          onChange={(e) => setEditProjEn(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitProjEdit(project);
                            else if (e.key === "Escape") setEditProjId(null);
                            else if (e.key === "Tab") { e.preventDefault(); document.querySelector(".proj-h-input.th")?.focus(); }
                          }}
                          placeholder="Project name (EN)"
                        />
                        <input
                          className="proj-h-input th"
                          value={editProjTh}
                          onChange={(e) => setEditProjTh(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitProjEdit(project);
                            else if (e.key === "Escape") setEditProjId(null);
                          }}
                          onBlur={() => commitProjEdit(project)}
                          placeholder="ชื่อภาษาไทย (ไม่บังคับ)"
                        />
                      </span>
                    ) : (
                      <span className="proj-h-name-view" onDoubleClick={() => startProjEdit(project)}>
                        <span className="proj-h-name-en">{project.name}</span>
                        {project.nameTh && <span className="proj-h-name-th">{project.nameTh}</span>}
                      </span>
                    )}
                  </span>
                  <button className={"proj-h-type " + (project.type || "year_plan")}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = (project.type === "ad_hoc") ? "year_plan" : "ad_hoc";
                            onSetProjectType(project.id, next);
                          }}
                          title="คลิกเพื่อสลับ Year Plan / Ad hoc">
                    {(project.type === "ad_hoc") ? "⚡ Ad hoc" : "◷ Year Plan"}
                  </button>
                  <button className="proj-h-rename"
                          onClick={(e) => { e.stopPropagation(); startProjEdit(project); }}
                          title="แก้ชื่อโปรเจกต์">✎</button>
                  <span className="proj-h-pills">
                    <span className="proj-h-pill"><span className="pill-lbl">subs</span><span className="pill-val">{total}</span></span>
                    <span className="proj-h-pill done"><span className="pill-lbl">shipped</span><span className="pill-val">{shipped}</span></span>
                    {risk > 0 && <span className="proj-h-pill blocked"><span className="pill-lbl">at risk</span><span className="pill-val">{risk}</span></span>}
                    <span className="proj-h-bar"><span className="proj-h-bar-fill" style={{ width: avgPct + "%", background: project.color }} /><span className="proj-h-bar-label">{avgPct}%</span></span>
                    <button className="sub-h-add" onClick={(e) => { e.stopPropagation(); onAddSub(project.id); }}>
                      + เพิ่ม sub
                    </button>
                  </span>
                </div>
              </div>

              {projOpen && subs.map((s, i) => renderSubRow(s, group, i))}
              {projOpen && (
                <div className="grid-row add-row"
                     onClick={() => onAddSub(project.id)}
                     onDragOver={(e) => onRowDragOver(e, { projectId: project.id, idxInGroup: subs.length })}>
                  <div className="cell row-num"><span className="row-idx">+</span></div>
                  <div className="cell add-cell" style={{ gridColumn: "2 / -1" }}>
                    <span className="add-icon">+</span>
                    <span className="add-text">เพิ่ม sub-project ใน {project.name}</span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

window.Grid = Grid;
window.COLUMNS = COLUMNS;
window.useHistory = useHistory;
window.TeamCell = TeamCell;
