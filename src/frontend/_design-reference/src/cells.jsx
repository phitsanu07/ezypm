// Cell-renderer components: chips, dropdowns, progress, assignee, etc.
const { useState, useRef, useEffect, useLayoutEffect } = React;

// ---------- Popover primitive ----------
function Popover({ anchorRef, onClose, children, align = "start" }) {
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, opacity: 0 });

  useLayoutEffect(() => {
    if (!anchorRef.current || !popRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const p = popRef.current.getBoundingClientRect();
    let left = align === "end" ? a.right - p.width : a.left;
    let top = a.bottom + 4;
    if (left + p.width > window.innerWidth - 8) left = window.innerWidth - p.width - 8;
    if (top + p.height > window.innerHeight - 8) top = a.top - p.height - 4;
    if (left < 8) left = 8;
    setPos({ top, left, opacity: 1 });
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (popRef.current && !popRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div ref={popRef} className="popover" style={pos}>
      {children}
    </div>,
    document.body
  );
}

// ---------- Status chip ----------
function StatusCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const ref = useRef(null);
  const opt = window.STATUS_OPTIONS.find(o => o.id === value) || window.STATUS_OPTIONS[0];
  return (
    <div className="cell-inner status-cell" onClick={onStartEdit}>
      <span ref={ref} className="chip status-chip" style={{ background: opt.bg, color: opt.fg }}>
        <span className="chip-dot" style={{ background: opt.dot }} />
        {opt.label}
      </span>
      {editing && (
        <Popover anchorRef={ref} onClose={onStopEdit}>
          <div className="pop-list">
            <div className="pop-head">เปลี่ยนสถานะ</div>
            {window.STATUS_OPTIONS.map(o => (
              <button key={o.id} className="pop-item" onClick={() => { onChange(o.id); onStopEdit(); }}>
                <span className="chip status-chip" style={{ background: o.bg, color: o.fg }}>
                  <span className="chip-dot" style={{ background: o.dot }} />
                  {o.label}
                </span>
                <span className="pop-th">{o.labelTh}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

// ---------- Priority chip ----------
function PriorityCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const ref = useRef(null);
  const opt = window.PRIORITY_OPTIONS.find(o => o.id === value) || window.PRIORITY_OPTIONS[3];
  return (
    <div className="cell-inner" onClick={onStartEdit}>
      <span ref={ref} className="chip priority-chip" style={{ background: opt.bg, color: opt.fg }}>
        {opt.label}
      </span>
      {editing && (
        <Popover anchorRef={ref} onClose={onStopEdit}>
          <div className="pop-list">
            <div className="pop-head">ระดับความสำคัญ</div>
            {window.PRIORITY_OPTIONS.map(o => (
              <button key={o.id} className="pop-item" onClick={() => { onChange(o.id); onStopEdit(); }}>
                <span className="chip priority-chip" style={{ background: o.bg, color: o.fg }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

// ---------- Assignee ----------
function AssigneeCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const ref = useRef(null);
  const p = window.PEOPLE[value];
  return (
    <div className="cell-inner" onClick={onStartEdit}>
      <span ref={ref} className="assignee">
        {p ? (
          <>
            <span className="avatar" style={{ background: p.color }}>{p.initials}</span>
            <span className="assignee-name">{p.name}</span>
          </>
        ) : (
          <span className="ph">ไม่ระบุ</span>
        )}
      </span>
      {editing && (
        <Popover anchorRef={ref} onClose={onStopEdit}>
          <div className="pop-list">
            <div className="pop-head">มอบหมายให้</div>
            {Object.entries(window.PEOPLE).map(([id, p]) => (
              <button key={id} className="pop-item" onClick={() => { onChange(id); onStopEdit(); }}>
                <span className="assignee">
                  <span className="avatar" style={{ background: p.color }}>{p.initials}</span>
                  <span className="assignee-name">{p.name}</span>
                </span>
                <span className="pop-th">{p.nameTh}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

// ---------- Progress (draggable bar) ----------
function ProgressCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function setFromEvent(e) {
    const r = barRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const pct = Math.max(0, Math.min(100, Math.round((x / r.width) * 100 / 5) * 5));
    onChange(pct);
  }

  useEffect(() => {
    if (!dragging) return;
    function move(e) { setFromEvent(e); }
    function up() { setDragging(false); }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging]);

  const tone = value >= 100 ? "done" : value >= 60 ? "high" : value >= 30 ? "mid" : "low";
  return (
    <div className="cell-inner progress-cell" onClick={onStartEdit}>
      <div
        ref={barRef}
        className={"progress-bar tone-" + tone}
        onMouseDown={(e) => { setDragging(true); setFromEvent(e); }}
      >
        <div className="progress-fill" style={{ width: value + "%" }} />
        <span className="progress-label">{value}%</span>
      </div>
    </div>
  );
}

// ---------- Tags ----------
function TagsCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const ref = useRef(null);
  const allTags = Object.keys(window.TAG_COLORS);
  return (
    <div className="cell-inner tags-cell" onClick={onStartEdit}>
      <span ref={ref} className="tags-wrap">
        {value.length === 0 && <span className="ph">— ไม่มี tag</span>}
        {value.map(t => {
          const c = window.TAG_COLORS[t] || { bg: "#EEF0F2", fg: "#52575C" };
          return <span key={t} className="chip tag-chip" style={{ background: c.bg, color: c.fg }}>{t}</span>;
        })}
      </span>
      {editing && (
        <Popover anchorRef={ref} onClose={onStopEdit}>
          <div className="pop-list">
            <div className="pop-head">เลือก tag</div>
            <div className="pop-tags">
              {allTags.map(t => {
                const active = value.includes(t);
                const c = window.TAG_COLORS[t];
                return (
                  <button
                    key={t}
                    className={"pop-tag " + (active ? "active" : "")}
                    onClick={() => {
                      const next = active ? value.filter(x => x !== t) : [...value, t];
                      onChange(next);
                    }}
                    style={{ background: c.bg, color: c.fg }}
                  >
                    {active && <span className="pop-tag-check">✓</span>}
                    {t}
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

// ---------- Date ----------
function DateCell({ value, onChange, editing, onStartEdit, onStopEdit }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const d = value ? new Date(value) : null;
  const today = new Date(); today.setHours(0,0,0,0);
  const days = d ? Math.round((d - today) / 86400000) : null;
  const overdue = days !== null && days < 0;
  const soon = days !== null && days >= 0 && days <= 3;

  const fmt = d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";
  return (
    <div className="cell-inner" onClick={onStartEdit}>
      {!editing && (
        <span ref={ref} className={"date " + (overdue ? "overdue" : soon ? "soon" : "")}>
          <span className="date-text">{fmt}</span>
          {days !== null && (
            <span className="date-rel">
              {overdue ? "เลย " + Math.abs(days) + "d" : days === 0 ? "วันนี้" : "อีก " + days + "d"}
            </span>
          )}
        </span>
      )}
      {editing && (
        <input
          ref={inputRef}
          type="date"
          className="date-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onStopEdit}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onStopEdit(); }}
        />
      )}
    </div>
  );
}

// ---------- Text (task name, sprint) ----------
function TextCell({ value, onChange, editing, onStartEdit, onStopEdit, placeholder, mono }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);
  return (
    <div className={"cell-inner text-cell " + (mono ? "mono" : "")} onClick={onStartEdit}>
      {!editing && (
        <span className={"text-val " + (!value ? "ph" : "")}>{value || placeholder || "—"}</span>
      )}
      {editing && (
        <input
          ref={inputRef}
          className="text-input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onStopEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              onStopEdit();
            }
          }}
        />
      )}
    </div>
  );
}

Object.assign(window, {
  StatusCell, PriorityCell, AssigneeCell, ProgressCell, TagsCell, DateCell, TextCell, Popover,
});
