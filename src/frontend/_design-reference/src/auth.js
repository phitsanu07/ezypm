// Shared auth helper. Uses localStorage for both user directory and session.
(function () {
  const USERS_KEY = "gridwork.users.v1";
  const SESSION_KEY = "gridwork.session.v1";

  const SEED_USERS = [
    { id: "u_admin", email: "admin@boonthavorn.com", name: "Admin",          nameTh: "ผู้ดูแลระบบ",  password: "admin123", role: "admin",  status: "active", color: "#1A1916", initials: "AD", lastActive: "2026-05-13T09:12:00" },
    { id: "u_anan",  email: "anan@boonthavorn.com",  name: "Anan Saetang",   nameTh: "อนันต์ แซ่ตั้ง", password: "anan123",  role: "editor", status: "active", color: "#7C5CFF", initials: "AS", lastActive: "2026-05-13T08:45:00" },
    { id: "u_ploy",  email: "ploy@boonthavorn.com",  name: "Ploy Wattana",   nameTh: "พลอย วัฒนา",   password: "ploy123",  role: "editor", status: "active", color: "#FF6B6B", initials: "PW", lastActive: "2026-05-12T16:30:00" },
    { id: "u_kong",  email: "kong@boonthavorn.com",  name: "Kong Phromma",   nameTh: "ก้อง พรหมมา",  password: "kong123",  role: "editor", status: "active", color: "#3DBE8B", initials: "KP", lastActive: "2026-05-12T14:08:00" },
    { id: "u_mint",  email: "mint@boonthavorn.com",  name: "Mint Chai",      nameTh: "มินท์ ใจดี",    password: "mint123",  role: "editor", status: "active", color: "#FFA94D", initials: "MC", lastActive: "2026-05-11T11:20:00" },
    { id: "u_fern",  email: "fern@boonthavorn.com",  name: "Fern Suksai",    nameTh: "เฟิร์น สุขใส",  password: "fern123",  role: "viewer", status: "active", color: "#3A86FF", initials: "FS", lastActive: "2026-05-13T07:55:00" },
    { id: "u_boss",  email: "boss@boonthavorn.com",  name: "Boss Niran",     nameTh: "บอส นิรันดร์", password: "boss123",  role: "editor", status: "active", color: "#E76F51", initials: "BN", lastActive: "2026-05-10T18:40:00" },
    { id: "u_tom",   email: "tom@boonthavorn.com",   name: "Tom Wisut",      nameTh: "ทอม วิสุทธิ์",  password: "tom123",   role: "viewer", status: "invited", color: "#9A1F66", initials: "TW", lastActive: null },
  ];

  const ROLES = {
    admin:  { label: "Admin",   labelTh: "ผู้ดูแลระบบ",   color: "#7C5CFF", bg: "#EDE7FF", fg: "#5836CC", caps: "All access. Manage users + projects." },
    editor: { label: "Editor",  labelTh: "ผู้แก้ไข",        color: "#3A86FF", bg: "#E4EEFF", fg: "#1A56C5", caps: "Create + edit projects and sub-projects." },
    viewer: { label: "Viewer",  labelTh: "ผู้อ่าน",          color: "#9CA0A6", bg: "#EEF0F2", fg: "#52575C", caps: "Read-only access." },
  };
  const STATUSES = {
    active:    { label: "Active",    labelTh: "ใช้งานอยู่",   color: "#3DBE8B", bg: "#D7F1E3", fg: "#1F6B45" },
    invited:   { label: "Invited",   labelTh: "ส่งคำเชิญแล้ว", color: "#F4A300", bg: "#FFF1D1", fg: "#8A5A00" },
    suspended: { label: "Suspended", labelTh: "ระงับ",         color: "#E5484D", bg: "#FFE0E1", fg: "#A1262A" },
  };

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS.slice();
  }
  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      // Re-resolve from current users in case role changed
      const users = loadUsers();
      const u = users.find(x => x.id === s.userId);
      return u ? { user: u } : null;
    } catch { return null; }
  }
  function setSession(userId) { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId })); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function login(email, password) {
    const users = loadUsers();
    const u = users.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) return { ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    if (u.status === "suspended") return { ok: false, error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน" };
    if (u.status === "invited") {
      // Activate on first login
      u.status = "active";
      saveUsers(users);
    }
    u.lastActive = new Date().toISOString();
    saveUsers(users);
    setSession(u.id);
    return { ok: true, user: u };
  }

  function requireAuth(redirectTo) {
    const s = getSession();
    if (!s) {
      window.location.href = redirectTo || "login.html";
      return null;
    }
    return s.user;
  }
  function requireAdmin() {
    const u = requireAuth();
    if (u && u.role !== "admin") {
      window.location.href = "GridWork.html?denied=1";
      return null;
    }
    return u;
  }

  function fmtLastActive(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const min = Math.round((now - d) / 60000);
    if (min < 1) return "เมื่อสักครู่";
    if (min < 60) return min + " นาทีก่อน";
    const hr = Math.round(min / 60);
    if (hr < 24) return hr + " ชั่วโมงก่อน";
    const day = Math.round(hr / 24);
    if (day < 7) return day + " วันก่อน";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  }

  window.Auth = {
    ROLES, STATUSES,
    loadUsers, saveUsers,
    getSession, setSession, clearSession,
    login, requireAuth, requireAdmin,
    fmtLastActive,
  };
})();
