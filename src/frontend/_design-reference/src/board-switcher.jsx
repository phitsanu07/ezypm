// Board switcher dropdown + no-access screen
const { useState: useBsState, useRef: useBsRef, useEffect: useBsEffect } = React;

function BoardSwitcher({ boards, currentBoard, onSelect, isAdmin }) {
  const [open, setOpen] = useBsState(false);
  const ref = useBsRef(null);

  useBsEffect(() => {
    if (!open) return;
    function onDoc(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!currentBoard) return null;

  return (
    <div className="board-switcher" ref={ref}>
      <button className="board-switcher-trigger" onClick={() => setOpen(o => !o)}>
        <span className="bs-icon" style={{ background: currentBoard.color }}>{currentBoard.icon}</span>
        <span className="bs-name">
          <span className="bs-name-en">{currentBoard.name}</span>
          {currentBoard.nameTh && <span className="bs-name-th">{currentBoard.nameTh}</span>}
        </span>
        <span className="bs-chev">⌄</span>
      </button>
      {open && (
        <div className="board-menu">
          <div className="board-menu-head">
            <span>กระดานของคุณ / Your boards</span>
            <span className="bm-count">{boards.length}</span>
          </div>
          <div className="board-menu-list">
            {boards.map(b => (
              <button
                key={b.id}
                className={"board-menu-item " + (b.id === currentBoard.id ? "active" : "")}
                onClick={() => { onSelect(b.id); setOpen(false); }}
              >
                <span className="bs-icon" style={{ background: b.color }}>{b.icon}</span>
                <span className="bs-name">
                  <span className="bs-name-en">{b.name}</span>
                  {b.nameTh && <span className="bs-name-th">{b.nameTh}</span>}
                </span>
                <span className="bm-meta">{b.memberIds.length} คน</span>
                {b.id === currentBoard.id && <span className="bm-check">✓</span>}
              </button>
            ))}
          </div>
          {isAdmin && (
            <>
              <div className="board-menu-divider" />
              <button className="board-menu-admin"
                      onClick={() => { window.location.href = "admin.html?tab=boards"; }}>
                <span style={{ width: 18, textAlign: "center" }}>⚙</span>
                จัดการกระดาน / Manage boards
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NoBoardAccess({ user }) {
  return (
    <div style={{
      display: "grid", placeItems: "center", height: "100vh",
      background: "#FAFAF7", padding: 24,
    }}>
      <div style={{
        maxWidth: 480, textAlign: "center",
        background: "#fff", padding: "40px 32px",
        borderRadius: 16, boxShadow: "0 8px 32px rgba(20,18,12,0.08)",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🔒</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
          ยังไม่มีกระดานที่เข้าถึงได้
        </h2>
        <p style={{ margin: "0 0 24px", color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.6 }}>
          บัญชี <b style={{ color: "var(--ink)" }}>{user.name}</b> ยังไม่ได้รับสิทธิ์เข้าถึงกระดานใดๆ<br/>
          กรุณาติดต่อ Admin เพื่อขอเพิ่มสิทธิ์
        </p>
        <button
          onClick={() => { window.Auth.clearSession(); window.location.href = "login.html"; }}
          style={{
            background: "var(--ink)", color: "#fff", border: 0,
            padding: "10px 22px", borderRadius: 9, fontSize: 13.5, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

window.BoardSwitcher = BoardSwitcher;
window.NoBoardAccess = NoBoardAccess;
