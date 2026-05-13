// Portfolio-level data: workspace > projects > sub-projects (no task breakdown)
window.PEOPLE = {
  anan:  { name: "Anan Saetang",   nameTh: "อนันต์ แซ่ตั้ง",     initials: "AS", color: "#7C5CFF" },
  ploy:  { name: "Ploy Wattana",   nameTh: "พลอย วัฒนา",        initials: "PW", color: "#FF6B6B" },
  kong:  { name: "Kong Phromma",   nameTh: "ก้อง พรหมมา",        initials: "KP", color: "#3DBE8B" },
  mint:  { name: "Mint Chai",      nameTh: "มินท์ ใจดี",          initials: "MC", color: "#FFA94D" },
  fern:  { name: "Fern Suksai",    nameTh: "เฟิร์น สุขใส",        initials: "FS", color: "#3A86FF" },
  boss:  { name: "Boss Niran",     nameTh: "บอส นิรันดร์",       initials: "BN", color: "#E76F51" },
};

window.STATUS_OPTIONS = [
  { id: "requirement", label: "Requirement", labelTh: "เก็บ requirement", dot: "#9CA0A6", bg: "#EEF0F2", fg: "#52575C" },
  { id: "spec",        label: "Spec",        labelTh: "ออกแบบ spec",      dot: "#3A86FF", bg: "#E4EEFF", fg: "#1A56C5" },
  { id: "dev",         label: "Dev",         labelTh: "พัฒนา",             dot: "#7C5CFF", bg: "#EDE7FF", fg: "#5836CC" },
  { id: "test",        label: "Test",        labelTh: "ทดสอบ (QA)",       dot: "#F4A300", bg: "#FFF1D1", fg: "#8A5A00" },
  { id: "uat",         label: "UAT",         labelTh: "UAT",               dot: "#FF7849", bg: "#FFE9D6", fg: "#9A4400" },
  { id: "go_live",     label: "Go Live",     labelTh: "ขึ้นใช้งานจริง",     dot: "#3DBE8B", bg: "#D7F1E3", fg: "#1F6B45" },
];

window.PRIORITY_OPTIONS = [
  { id: "p1", label: "P1 · Urgent",  short: "P1", bg: "#FFE0E1", fg: "#A1262A" },
  { id: "p2", label: "P2 · High",    short: "P2", bg: "#FFEAD1", fg: "#8A5A00" },
  { id: "p3", label: "P3 · Normal",  short: "P3", bg: "#E4EEFF", fg: "#1A56C5" },
  { id: "p4", label: "P4 · Low",     short: "P4", bg: "#EEF0F2", fg: "#52575C" },
];

window.TAG_COLORS = {
  backend:  { bg: "#EDE7FF", fg: "#5836CC" },
  frontend: { bg: "#E0F4FF", fg: "#0A5C90" },
  devops:   { bg: "#FFE9D6", fg: "#9A4400" },
  security: { bg: "#FFE0E1", fg: "#A1262A" },
  payment:  { bg: "#D7F1E3", fg: "#1F6B45" },
  design:   { bg: "#FFE0F0", fg: "#9A1F66" },
  db:       { bg: "#E7F0FF", fg: "#1A56C5" },
  mobile:   { bg: "#EDE7FF", fg: "#5836CC" },
  api:      { bg: "#EDE7FF", fg: "#5836CC" },
  hr:       { bg: "#FFE0F0", fg: "#9A1F66" },
  finance:  { bg: "#D7F1E3", fg: "#1F6B45" },
  infra:    { bg: "#FFE9D6", fg: "#9A4400" },
  q3:       { bg: "#FFF1D1", fg: "#8A5A00" },
};

// Each sub-project is a single ROW in the portfolio table — no task breakdown.
window.PROJECTS = [
  {
    id: "retail", name: "Retail Platform", nameTh: "แพลตฟอร์มค้าปลีก",
    icon: "▦", color: "#7C5CFF", type: "year_plan",
    subProjects: [
      { id: "checkout", name: "Web Checkout v2",     nameTh: "เช็คเอาท์เว็บ v2", icon: "◐",
        lead: "kong", team: ["kong","fern","mint"], status: "dev", priority: "p1",
        due: "2026-06-20", progress: 55, quarter: "Q2-26", tags: ["frontend","payment"] },
      { id: "pos",      name: "POS Sync",            nameTh: "ระบบหน้าร้าน POS",  icon: "◑",
        lead: "kong", team: ["kong","ploy","boss"],  status: "dev", priority: "p1",
        due: "2026-05-30", progress: 70, quarter: "Q2-26", tags: ["backend","api"] },
      { id: "inv",      name: "Inventory API",       nameTh: "Inventory API",     icon: "◒",
        lead: "ploy", team: ["ploy","kong","anan"],  status: "uat", priority: "p2",
        due: "2026-05-25", progress: 85, quarter: "Q2-26", tags: ["backend","api"] },
      { id: "mobile",   name: "Customer Mobile App", nameTh: "แอปลูกค้า",          icon: "◓",
        lead: "fern", team: ["fern","mint","anan"],  status: "spec", priority: "p2",
        due: "2026-07-15", progress: 35, quarter: "Q3-26", tags: ["mobile","frontend"] },
    ],
  },
  {
    id: "internal", name: "Internal Tools", nameTh: "เครื่องมือภายใน",
    icon: "⌘", color: "#3DBE8B", type: "year_plan",
    subProjects: [
      { id: "hr",      name: "HR Portal",          nameTh: "พอร์ทัล HR",         icon: "◐",
        lead: "fern", team: ["fern","ploy","kong"], status: "dev", priority: "p2",
        due: "2026-06-30", progress: 60, quarter: "Q2-26", tags: ["hr","frontend"] },
      { id: "finance", name: "Finance Dashboard",  nameTh: "แดชบอร์ดการเงิน",     icon: "◑",
        lead: "kong", team: ["kong","fern"],       status: "requirement", priority: "p3",
        due: "2026-08-10", progress: 15, quarter: "Q3-26", tags: ["finance","frontend"] },
    ],
  },
  {
    id: "infra", name: "Infrastructure & SRE", nameTh: "Infra & SRE",
    icon: "◈", color: "#FF7849", type: "ad_hoc",
    subProjects: [
      { id: "pg",  name: "Postgres 16 upgrade", nameTh: "อัปเกรด Postgres 16",  icon: "◐",
        lead: "boss", team: ["boss","anan"],    status: "uat", priority: "p1",
        due: "2026-05-22", progress: 80, quarter: "Q2-26", tags: ["infra","db"] },
      { id: "k8s", name: "K8s migration",       nameTh: "ย้ายไป Kubernetes",   icon: "◑",
        lead: "boss", team: ["boss","anan","ploy"], status: "uat", priority: "p1",
        due: "2026-07-05", progress: 40, quarter: "Q3-26", tags: ["infra","devops"] },
      { id: "sec", name: "Security hardening",  nameTh: "เพิ่มความปลอดภัยระบบ",  icon: "◒",
        lead: "anan", team: ["anan","boss"],    status: "requirement", priority: "p2",
        due: "2026-09-01", progress: 10, quarter: "Q3-26", tags: ["security","infra"] },
    ],
  },
];
