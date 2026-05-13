// User menu — minimal avatar trigger, full panel on click
const { useState: useUmState, useRef: useUmRef, useEffect: useUmEffect } = React;

function UserMenu({ currentUser, onLogout }) {
  const [open, setOpen] = useUmState(false);
  const ref = useUmRef(null);
  const triggerRef = useUmRef(null);
  const [pos, setPos] = useUmState({ top: 0, right: 0 });

  useUmEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!ref.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    setOpen(o => !o);
  }

  const isAdmin = currentUser.role === "admin";
  const ROLES = window.Auth.ROLES;
  const role = ROLES[currentUser.role] || ROLES.viewer;

  return (
    <>
      <button
        ref={triggerRef}
        className={"user-trigger " + (open ? "open" : "")}
        onClick={toggle}
        title={currentUser.name}
      >
        <span className="user-trigger-av" style={{ background: currentUser.color }}>
          {currentUser.initials}
        </span>
        <span className="user-trigger-status" />
      </button>

      {open && (
        <div ref={ref} className="user-panel" style={{ top: pos.top, right: pos.right }}>
          <div className="user-panel-head">
            <span className="user-panel-av" style={{ background: currentUser.color }}>
              {currentUser.initials}
            </span>
            <div className="user-panel-id">
              <div className="user-panel-name">{currentUser.name}</div>
              {currentUser.nameTh && <div className="user-panel-name-th">{currentUser.nameTh}</div>}
              <div className="user-panel-email">{currentUser.email}</div>
              <span
                className="user-panel-role"
                style={{ background: role.bg, color: role.fg }}
              >
                {role.label} · {role.labelTh}
              </span>
            </div>
          </div>

          <div className="user-panel-nav">
            <a href="GridWork.html" className="user-panel-link">
              <span className="upl-icon">▦</span>
              <span className="upl-text">
                <span className="upl-en">Portfolio</span>
                <span className="upl-th">กระดานโปรเจกต์</span>
              </span>
            </a>
            {isAdmin && (
              <a href="admin.html" className="user-panel-link">
                <span className="upl-icon">⚙</span>
                <span className="upl-text">
                  <span className="upl-en">Admin</span>
                  <span className="upl-th">จัดการระบบ</span>
                </span>
              </a>
            )}
          </div>

          <button className="user-panel-logout" onClick={onLogout}>
            <span className="upl-icon">⎋</span>
            <span>ออกจากระบบ · Sign out</span>
          </button>
        </div>
      )}
    </>
  );
}

window.UserMenu = UserMenu;
