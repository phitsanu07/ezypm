// Multi-board support: each board has its own projects + member list
(function () {
  const BOARDS_KEY = "gridwork.boards.v1";
  const PROJ_KEY = (boardId) => "gridwork.projects." + boardId + ".v1";
  const CURRENT_BOARD_KEY = "gridwork.currentBoard.v1";

  function seedBoards() {
    // Get all seed user ids
    const users = window.Auth.loadUsers();
    const allIds = users.map(u => u.id);
    const editorIds = users.filter(u => u.role !== "viewer").map(u => u.id);
    const internalIds = users.filter(u => ["u_admin","u_anan","u_ploy","u_fern"].includes(u.id)).map(u => u.id);
    const infraIds = users.filter(u => ["u_admin","u_boss","u_anan"].includes(u.id)).map(u => u.id);
    return [
      {
        id: "board_main",
        name: "Boonthavorn IT Portfolio",
        nameTh: "ภาพรวมโปรเจกต์ IT",
        icon: "▦",
        color: "#7C5CFF",
        ownerId: "u_admin",
        memberIds: allIds, // everyone
        createdAt: "2026-04-01T09:00:00",
      },
      {
        id: "board_internal",
        name: "Internal Operations",
        nameTh: "งานภายในองค์กร",
        icon: "⌘",
        color: "#3DBE8B",
        ownerId: "u_admin",
        memberIds: internalIds,
        createdAt: "2026-04-15T10:30:00",
      },
      {
        id: "board_infra",
        name: "Infra & SRE War Room",
        nameTh: "ห้องควบคุม Infra",
        icon: "◈",
        color: "#FF7849",
        ownerId: "u_admin",
        memberIds: infraIds,
        createdAt: "2026-05-01T14:20:00",
      },
    ];
  }

  function loadBoards() {
    try {
      const raw = localStorage.getItem(BOARDS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const seeded = seedBoards();
    localStorage.setItem(BOARDS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  function saveBoards(boards) { localStorage.setItem(BOARDS_KEY, JSON.stringify(boards)); }

  function loadProjects(boardId) {
    try {
      const raw = localStorage.getItem(PROJ_KEY(boardId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
  function saveProjects(boardId, projects) {
    localStorage.setItem(PROJ_KEY(boardId), JSON.stringify(projects));
  }
  function deleteProjects(boardId) { localStorage.removeItem(PROJ_KEY(boardId)); }

  // Default seed projects by board
  function getSeedProjects(boardId) {
    const all = window.PROJECTS || [];
    if (boardId === "board_main") return all;
    if (boardId === "board_internal") return all.filter(p => p.id === "internal" || p.id === "retail");
    if (boardId === "board_infra") return all.filter(p => p.id === "infra");
    return [];
  }

  function getBoardsForUser(user) {
    const boards = loadBoards();
    if (user.role === "admin") return boards;
    return boards.filter(b => b.memberIds && b.memberIds.includes(user.id));
  }

  function getCurrentBoardId() {
    return localStorage.getItem(CURRENT_BOARD_KEY);
  }
  function setCurrentBoardId(id) {
    localStorage.setItem(CURRENT_BOARD_KEY, id);
  }

  function userCanAccess(user, boardId) {
    const boards = loadBoards();
    const b = boards.find(x => x.id === boardId);
    if (!b) return false;
    if (user.role === "admin") return true;
    return b.memberIds && b.memberIds.includes(user.id);
  }

  function resolveBoardForUser(user) {
    // 1. ?board= query param wins if allowed
    const qs = new URLSearchParams(location.search);
    const want = qs.get("board");
    if (want && userCanAccess(user, want)) {
      setCurrentBoardId(want);
      return want;
    }
    // 2. last-used if still allowed
    const last = getCurrentBoardId();
    if (last && userCanAccess(user, last)) return last;
    // 3. first board user has access to
    const allowed = getBoardsForUser(user);
    if (allowed.length === 0) return null;
    setCurrentBoardId(allowed[0].id);
    return allowed[0].id;
  }

  window.Boards = {
    loadBoards, saveBoards,
    loadProjects, saveProjects, deleteProjects,
    getSeedProjects,
    getBoardsForUser,
    getCurrentBoardId, setCurrentBoardId,
    userCanAccess, resolveBoardForUser,
  };
})();
