// Boards admin panel
const { useState: useBpState, useMemo: useBpMemo } = React;

const BOARD_COLORS = ["#7C5CFF","#3DBE8B","#FF7849","#3A86FF","#E5484D","#F4A300","#9A1F66","#0A5C90","#5836CC","#1F9D6F"];
const BOARD_ICONS  = ["▦","⌘","◈","◉","◆","▲","●","◐","✦","◷"];

function BoardsPanel({ me }) {
  const [boards, setBoards] = useBpState(window.Boards.loadBoards());
  const [users] = useBpState(window.Auth.loadUsers());
  const [filter, setFilter] = useBpState("");
  const [editingBoard, setEditingBoard] = useBpState(null);
  const [confirmDelete, setConfirmDelete] = useBpState(null);

  function persist(next) { setBoards(next); window.Boards.saveBoards(next); }
  function updateBoard(id, patch) { persist(boards.map(b => b.id === id ? { ...b, ...patch } : b)); }
  function deleteBoard(id) {
    window.Boards.deleteProjects(id);
    persist(boards.filter(b => b.id !== id));
  }

  const filtered = useBpMemo(() => {
    if (!filter) return boards;
    const q = filter.toLowerCase();
    return boards.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.nameTh || "").toLowerCase().includes(q)
    );
  }, [boards, filter]);

  const stats = useBpMemo(() => {
    const totalMembers = boards.reduce((a, b) => a + b.memberIds.length, 0);
    return { total: boards.length, totalMembers, avgMembers: boards.length ? Math.round(totalMembers / boards.length) : 0 };
  }, [boards]);

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>จัดการกระดาน / Board Management</h1>
          <p>สร้างกระดานสำหรับแต่ละทีม กำหนดสมาชิกที่เข้าถึงได้ และตั้งค่ารายละเอียด</p>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="lbl">Total boards</span>
          <span className="val purple">{stats.total}</span>
          <span className="sub">กระดานทั้งหมด</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Total memberships</span>
          <span className="val">{stats.totalMembers}</span>
          <span className="sub">สมาชิกรวมทุกกระดาน</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Avg / board</span>
          <span className="val green">{stats.avgMembers}</span>
          <span className="sub">เฉลี่ยสมาชิกต่อกระดาน</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Users</span>
          <span className="val amber">{users.length}</span>
          <span className="sub">ผู้ใช้ในระบบ</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <span style={{ color: "var(--ink-3)" }}>⌕</span>
          <input
            placeholder="ค้นหากระดาน…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button className="admin-cta" onClick={() => setEditingBoard("new")}>
          <span className="plus">+</span> สร้างกระดานใหม่
        </button>
      </div>

      <div className="board-grid">
        {filtered.map(b => {
          const ownerUser = users.find(u => u.id === b.ownerId);
          return (
            <div key={b.id} className="board-card">
              <div className="board-card-head" style={{ background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)` }}>
                <span className="bc-icon" style={{ background: "rgba(255,255,255,0.22)" }}>{b.icon}</span>
                <div className="bc-actions">
                  <button className="bc-icon-btn" onClick={() => setEditingBoard(b)} title="แก้ไข">✎</button>
                  <button className="bc-icon-btn danger" onClick={() => setConfirmDelete(b)} title="ลบ">×</button>
                </div>
              </div>
              <div className="board-card-body">
                <h3 className="bc-name">{b.name}</h3>
                {b.nameTh && <div className="bc-name-th">{b.nameTh}</div>}
                <div className="bc-meta-line">
                  <span className="bc-meta-lbl">สร้างเมื่อ</span>
                  <span className="bc-meta-val">{fmtDate(b.createdAt)}</span>
                </div>
                <div className="bc-meta-line">
                  <span className="bc-meta-lbl">เจ้าของ</span>
                  <span className="bc-meta-val">
                    {ownerUser ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className="av-tiny" style={{ background: ownerUser.color }}>{ownerUser.initials}</span>
                        {ownerUser.name}
                      </span>
                    ) : "—"}
                  </span>
                </div>
                <div className="bc-members">
                  <div className="bc-members-head">
                    <span className="bc-meta-lbl">สมาชิก / Members</span>
                    <span className="bc-members-count">{b.memberIds.length} คน</span>
                  </div>
                  <div className="bc-avatar-row">
                    {b.memberIds.slice(0, 8).map(id => {
                      const u = users.find(x => x.id === id);
                      if (!u) return null;
                      return <span key={id} className="bc-av" style={{ background: u.color }} title={u.name}>{u.initials}</span>;
                    })}
                    {b.memberIds.length > 8 && (
                      <span className="bc-av more">+{b.memberIds.length - 8}</span>
                    )}
                  </div>
                </div>
                <button className="bc-open" onClick={() => { window.location.href = `GridWork.html?board=${b.id}`; }}>
                  เปิดกระดาน →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingBoard && (
        <BoardEditModal
          board={editingBoard === "new" ? null : editingBoard}
          users={users}
          me={me}
          onClose={() => setEditingBoard(null)}
          onSave={(b) => {
            if (editingBoard === "new") persist([...boards, b]);
            else persist(boards.map(x => x.id === b.id ? b : x));
            setEditingBoard(null);
          }}
        />
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>ลบกระดาน?</h3>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                คุณกำลังจะลบกระดาน <b>{confirmDelete.name}</b> รวมถึงข้อมูลโปรเจกต์ทั้งหมดในกระดานนี้ การกระทำนี้ไม่สามารถกู้คืนได้
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={() => { deleteBoard(confirmDelete.id); setConfirmDelete(null); }}
                      style={{ background: "#A1262A" }}>
                ลบกระดาน
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BoardEditModal({ board, users, me, onClose, onSave }) {
  const isNew = !board;
  const [name, setName] = useBpState(board?.name || "");
  const [nameTh, setNameTh] = useBpState(board?.nameTh || "");
  const [icon, setIcon] = useBpState(board?.icon || BOARD_ICONS[0]);
  const [color, setColor] = useBpState(board?.color || BOARD_COLORS[0]);
  const [memberIds, setMemberIds] = useBpState(board?.memberIds || [me.id]);
  const [err, setErr] = useBpState("");
  const [memberFilter, setMemberFilter] = useBpState("");

  function toggleMember(id) {
    setMemberIds(memberIds.includes(id)
      ? memberIds.filter(x => x !== id)
      : [...memberIds, id]);
  }
  function selectAll() { setMemberIds(users.map(u => u.id)); }
  function selectNone() { setMemberIds([me.id]); }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr("ต้องมีชื่อกระดาน"); return; }
    onSave({
      id: board?.id || ("board_" + Math.random().toString(36).slice(2, 8)),
      name: name.trim(),
      nameTh: nameTh.trim(),
      icon, color,
      ownerId: board?.ownerId || me.id,
      memberIds: memberIds.includes(me.id) ? memberIds : [...memberIds, me.id],
      createdAt: board?.createdAt || new Date().toISOString(),
    });
  }

  const filteredUsers = useBpMemo(() => {
    if (!memberFilter) return users;
    const q = memberFilter.toLowerCase();
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, memberFilter]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>{isNew ? "สร้างกระดานใหม่" : "แก้ไขกระดาน"}</h3>
            <p>{isNew ? "ตั้งชื่อ เลือกสมาชิก แล้วเริ่มใช้งานได้ทันที" : "อัปเดตการตั้งค่าและสิทธิ์การเข้าถึงของกระดาน"}</p>
          </div>
          <div className="modal-body" style={{ maxHeight: 560, overflow: "auto" }}>
            {err && <div style={{ background: "#FFE0E1", color: "#A1262A", padding: "8px 12px", borderRadius: 6, fontSize: 12 }}>{err}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12 }}>
              <div className="modal-field">
                <label>ไอคอน / ธีม</label>
                <div className="board-preview" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                  <span className="board-preview-icon">{icon}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="modal-field">
                  <label>ชื่อกระดาน (EN) *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mobile App Squad" autoFocus />
                </div>
                <div className="modal-field">
                  <label>ชื่อกระดาน (TH)</label>
                  <input value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="ทีมพัฒนาโมบาย" />
                </div>
              </div>
            </div>

            <div className="modal-field">
              <label>เลือกไอคอน</label>
              <div className="icon-grid">
                {BOARD_ICONS.map(i => (
                  <button key={i} type="button"
                          className={"icon-btn " + (i === icon ? "active" : "")}
                          onClick={() => setIcon(i)}>{i}</button>
                ))}
              </div>
            </div>

            <div className="modal-field">
              <label>เลือกสี</label>
              <div className="color-grid">
                {BOARD_COLORS.map(c => (
                  <button key={c} type="button"
                          className={"color-btn " + (c === color ? "active" : "")}
                          style={{ background: c }}
                          onClick={() => setColor(c)}>
                    {c === color && "✓"}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-field">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>สมาชิกที่เข้าถึงได้ ({memberIds.length} / {users.length})</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={selectAll}
                          style={{ background: "transparent", border: 0, fontSize: 11, color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>
                    เลือกทั้งหมด
                  </button>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <button type="button" onClick={selectNone}
                          style={{ background: "transparent", border: 0, fontSize: 11, color: "var(--ink-3)", cursor: "pointer", fontWeight: 600 }}>
                    ล้าง
                  </button>
                </span>
              </label>
              <div className="member-search">
                <span style={{ color: "var(--ink-3)" }}>⌕</span>
                <input
                  placeholder="ค้นหาสมาชิก…"
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                />
              </div>
              <div className="member-picker">
                {filteredUsers.map(u => {
                  const checked = memberIds.includes(u.id);
                  const isMe = u.id === me.id;
                  const role = window.Auth.ROLES[u.role];
                  return (
                    <label key={u.id} className={"member-row " + (checked ? "checked" : "")}>
                      <input type="checkbox" checked={checked} disabled={isMe}
                             onChange={() => !isMe && toggleMember(u.id)} />
                      <span className="member-av" style={{ background: u.color }}>{u.initials}</span>
                      <span className="member-info">
                        <span className="member-nm">{u.name}{isMe && <span className="self-pill" style={{ marginLeft: 6 }}>YOU</span>}</span>
                        <span className="member-em">{u.email}</span>
                      </span>
                      <span className="member-role" style={{ background: role.bg, color: role.fg }}>{role.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn-primary">{isNew ? "สร้างกระดาน" : "บันทึก"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.BoardsPanel = BoardsPanel;
