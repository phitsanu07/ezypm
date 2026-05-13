// Admin: tabs for Users + Boards
const { useState, useMemo, useEffect } = React;

function Admin() {
  const me = window.Auth.requireAdmin();
  if (!me) return null;

  const initialTab = new URLSearchParams(location.search).get("tab") || "users";
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-left">
          <div className="logo">
            <span className="logo-mark">▦</span>
            <span className="logo-name">GridWork</span>
          </div>
          <nav className="breadcrumb">
            <a href="GridWork.html" className="crumb" style={{ textDecoration: "none" }}>Boonthavorn IT</a>
            <span className="crumb-sep">/</span>
            <span className="crumb current">Admin <span className="crumb-th">จัดการระบบ</span></span>
          </nav>
        </div>
        <div className="appbar-right">
          <UserMenu currentUser={me} onLogout={() => { window.Auth.clearSession(); window.location.href = "login.html"; }} />
        </div>
      </header>

      <main className="admin-host">
        <div className="admin-shell">
          <div className="admin-tabs">
            <button className={"admin-tab " + (tab === "users" ? "active" : "")} onClick={() => setTab("users")}>
              <span className="at-icon">👤</span>
              <span>ผู้ใช้ / Users</span>
            </button>
            <button className={"admin-tab " + (tab === "boards" ? "active" : "")} onClick={() => setTab("boards")}>
              <span className="at-icon">▦</span>
              <span>กระดาน / Boards</span>
            </button>
          </div>

          {tab === "users" && <UsersPanel me={me} />}
          {tab === "boards" && <BoardsPanel me={me} />}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Admin />);
