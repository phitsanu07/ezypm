// Users panel
const { useState: useUpState, useMemo: useUpMemo } = React;

function UsersPanel({ me }) {
  const [users, setUsers] = useUpState(window.Auth.loadUsers());
  const [filter, setFilter] = useUpState("");
  const [roleFilter, setRoleFilter] = useUpState("all");
  const [editingUser, setEditingUser] = useUpState(null);
  const [confirming, setConfirming] = useUpState(null);

  function persist(next) { setUsers(next); window.Auth.saveUsers(next); }
  function updateUser(id, patch) { persist(users.map(u => u.id === id ? { ...u, ...patch } : u)); }
  function deleteUser(id) { persist(users.filter(u => u.id !== id)); }

  const filtered = useUpMemo(() => {
    let r = users;
    if (roleFilter !== "all") r = r.filter(u => u.role === roleFilter);
    if (filter) {
      const q = filter.toLowerCase();
      r = r.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nameTh || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [users, filter, roleFilter]);

  const stats = useUpMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === "admin").length,
    active: users.filter(u => u.status === "active").length,
    invited: users.filter(u => u.status === "invited").length,
    suspended: users.filter(u => u.status === "suspended").length,
  }), [users]);

  const ROLES = window.Auth.ROLES;
  const STATUSES = window.Auth.STATUSES;

  function cycleRole(u) {
    if (u.id === me.id) {
      setConfirming({ action: "self-role", user: u });
      return;
    }
    const keys = Object.keys(ROLES);
    const next = keys[(keys.indexOf(u.role) + 1) % keys.length];
    updateUser(u.id, { role: next });
  }
  function cycleStatus(u) {
    if (u.id === me.id) return;
    const keys = Object.keys(STATUSES);
    const next = keys[(keys.indexOf(u.status) + 1) % keys.length];
    updateUser(u.id, { status: next });
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>จัดการผู้ใช้ / User Management</h1>
          <p>เพิ่ม แก้ไข เปลี่ยนสิทธิ์ และระงับการใช้งานของสมาชิกในทีม</p>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="lbl">Total users</span>
          <span className="val purple">{stats.total}</span>
          <span className="sub">ผู้ใช้ทั้งหมด</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Active</span>
          <span className="val green">{stats.active}</span>
          <span className="sub">ใช้งานอยู่</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Admins</span>
          <span className="val">{stats.admins}</span>
          <span className="sub">ผู้ดูแลระบบ</span>
        </div>
        <div className="stat-card">
          <span className="lbl">Pending / Suspended</span>
          <span className="val amber">{stats.invited + stats.suspended}</span>
          <span className="sub">ส่งคำเชิญ / ระงับ</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <span style={{ color: "var(--ink-3)" }}>⌕</span>
          <input
            placeholder="ค้นหาด้วยชื่อหรืออีเมล…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {[["all", "ทั้งหมด"],["admin", "Admins"],["editor", "Editors"],["viewer", "Viewers"]].map(([id, lbl]) => (
            <button key={id}
                    className={"filter-pill " + (roleFilter === id ? "active" : "")}
                    onClick={() => setRoleFilter(id)}>{lbl}</button>
          ))}
        </div>
        <button className="admin-cta" onClick={() => setEditingUser("new")}>
          <span className="plus">+</span> เพิ่มผู้ใช้ใหม่
        </button>
      </div>

      <div className="user-table">
        <div className="ut-row hdr">
          <div className="ut-num">#</div>
          <div>ผู้ใช้ / User</div>
          <div>อีเมล</div>
          <div>สิทธิ์ / Role</div>
          <div>สถานะ</div>
          <div>เข้าใช้งานล่าสุด</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>
        {filtered.map((u, i) => {
          const role = ROLES[u.role] || ROLES.viewer;
          const status = STATUSES[u.status] || STATUSES.active;
          const isSelf = u.id === me.id;
          return (
            <div key={u.id} className={"ut-row " + (isSelf ? "self" : "")}>
              <div className="ut-num">{i + 1}</div>
              <div className="ut-user">
                <span className="av" style={{ background: u.color }}>{u.initials}</span>
                <span className="who">
                  <span className="nm">
                    {u.name}
                    {isSelf && <span className="self-pill">YOU</span>}
                  </span>
                  {u.nameTh && <span className="nm-th">{u.nameTh}</span>}
                </span>
              </div>
              <div className="ut-email">{u.email}</div>
              <div>
                <button className="ut-role-chip" onClick={() => cycleRole(u)}
                        style={{ background: role.bg, color: role.fg }} title="คลิกเพื่อเปลี่ยนสิทธิ์">
                  <span className="dot" style={{ background: role.color }} />
                  {role.label}
                </button>
              </div>
              <div>
                <button className="ut-status-chip" onClick={() => cycleStatus(u)} disabled={isSelf}
                        style={{ background: status.bg, color: status.fg,
                                 cursor: isSelf ? "not-allowed" : "pointer", opacity: isSelf ? 0.7 : 1 }}
                        title={isSelf ? "เปลี่ยนสถานะตัวเองไม่ได้" : "คลิกเพื่อเปลี่ยนสถานะ"}>
                  <span className="dot" style={{ background: status.color }} />
                  {status.label}
                </button>
              </div>
              <div className={"ut-last " + (!u.lastActive ? "never" : "")}>
                {window.Auth.fmtLastActive(u.lastActive)}
              </div>
              <div className="ut-actions">
                <button className="ut-act-btn" onClick={() => setEditingUser(u)} title="แก้ไข">✎</button>
                <button className="ut-act-btn" onClick={() => setConfirming({ action: "reset", user: u })} title="รีเซ็ตรหัสผ่าน">🔑</button>
                <button className="ut-act-btn danger" disabled={isSelf}
                        style={{ opacity: isSelf ? 0.3 : 1 }}
                        onClick={() => !isSelf && setConfirming({ action: "delete", user: u })}
                        title={isSelf ? "ลบตัวเองไม่ได้" : "ลบผู้ใช้"}>×</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ink-3)" }}>
            ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข
          </div>
        )}
      </div>

      {editingUser && (
        <UserEditModal user={editingUser === "new" ? null : editingUser} users={users}
          onClose={() => setEditingUser(null)}
          onSave={(u) => {
            if (editingUser === "new") persist([...users, u]);
            else persist(users.map(x => x.id === u.id ? u : x));
            setEditingUser(null);
          }} />
      )}

      {confirming && (
        <div className="modal-backdrop" onClick={() => setConfirming(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                {confirming.action === "delete" && "ลบผู้ใช้?"}
                {confirming.action === "reset" && "รีเซ็ตรหัสผ่าน?"}
                {confirming.action === "self-role" && "เปลี่ยนสิทธิ์ของตัวเอง?"}
              </h3>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                {confirming.action === "delete" && <>คุณกำลังจะลบ <b>{confirming.user.name}</b> ({confirming.user.email}) ออกจากระบบ การกระทำนี้ไม่สามารถกู้คืนได้</>}
                {confirming.action === "reset" && <>รีเซ็ตรหัสผ่านของ <b>{confirming.user.name}</b> เป็น <code>changeme123</code> ผู้ใช้จะต้องเปลี่ยนรหัสในการเข้าใช้ครั้งถัดไป</>}
                {confirming.action === "self-role" && <>ถ้าเปลี่ยนสิทธิ์ของตัวเองเป็น Editor/Viewer คุณจะไม่สามารถกลับเข้ามาที่หน้า Admin ได้อีก ต้องการดำเนินการต่อ?</>}
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setConfirming(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={() => {
                if (confirming.action === "delete") deleteUser(confirming.user.id);
                if (confirming.action === "reset") updateUser(confirming.user.id, { password: "changeme123" });
                if (confirming.action === "self-role") {
                  const keys = Object.keys(ROLES);
                  const next = keys[(keys.indexOf(confirming.user.role) + 1) % keys.length];
                  updateUser(confirming.user.id, { role: next });
                  if (next !== "admin") setTimeout(() => window.location.href = "GridWork.html", 600);
                }
                setConfirming(null);
              }} style={confirming.action === "delete" ? { background: "#A1262A" } : {}}>
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UserEditModal({ user, users, onClose, onSave }) {
  const isNew = !user;
  const [name, setName] = useUpState(user?.name || "");
  const [nameTh, setNameTh] = useUpState(user?.nameTh || "");
  const [email, setEmail] = useUpState(user?.email || "");
  const [role, setRole] = useUpState(user?.role || "viewer");
  const [color, setColor] = useUpState(user?.color || "#7C5CFF");
  const [password, setPassword] = useUpState("");
  const [err, setErr] = useUpState("");

  function initialsFrom(n) {
    return n.trim().split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "??";
  }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr("ต้องมีชื่อ"); return; }
    if (!email.trim()) { setErr("ต้องมีอีเมล"); return; }
    if (isNew && users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setErr("อีเมลนี้ถูกใช้แล้ว"); return;
    }
    if (isNew && !password.trim()) { setErr("ต้องตั้งรหัสผ่านเริ่มต้น"); return; }
    onSave({
      id: user?.id || ("u_" + Math.random().toString(36).slice(2, 8)),
      name: name.trim(), nameTh: nameTh.trim(), email: email.trim(),
      role, color, initials: initialsFrom(name),
      password: password.trim() || user?.password || "changeme123",
      status: user?.status || "invited",
      lastActive: user?.lastActive || null,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>{isNew ? "เพิ่มผู้ใช้ใหม่" : "แก้ไขผู้ใช้"}</h3>
            <p>{isNew ? "ระบบจะส่งคำเชิญด้วยรหัสเริ่มต้นนี้" : "อัปเดตข้อมูลของ " + user.name}</p>
          </div>
          <div className="modal-body">
            {err && <div style={{ background: "#FFE0E1", color: "#A1262A", padding: "8px 12px", borderRadius: 6, fontSize: 12 }}>{err}</div>}
            <div className="modal-field">
              <label>ชื่อ (EN) *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anan Saetang" autoFocus />
            </div>
            <div className="modal-field">
              <label>ชื่อ (TH)</label>
              <input value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="อนันต์ แซ่ตั้ง" />
            </div>
            <div className="modal-field">
              <label>อีเมล *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="anan@boonthavorn.com" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
              <div className="modal-field">
                <label>สิทธิ์ / Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="admin">Admin — ผู้ดูแลระบบ</option>
                  <option value="editor">Editor — ผู้แก้ไข</option>
                  <option value="viewer">Viewer — ผู้อ่าน</option>
                </select>
              </div>
              <div className="modal-field">
                <label>สี avatar</label>
                <div style={{ position: "relative", height: 38, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                  {initialsFrom(name) || "?"}
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                         style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: 0 }} />
                </div>
              </div>
            </div>
            {isNew && (
              <div className="modal-field">
                <label>รหัสผ่านเริ่มต้น *</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" placeholder="changeme123" />
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn-primary">{isNew ? "เพิ่มผู้ใช้" : "บันทึก"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.UsersPanel = UsersPanel;
