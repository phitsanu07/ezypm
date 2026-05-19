import { useEffect, useMemo, useState } from "react";
import type {
  PortfolioPayload,
  Activity,
  ActivityType,
  Profile,
  ProjectWithSubs,
} from "@/types";
import { ACTIVITY_TYPE_META, ACTIVITY_TYPE_VALUES } from "@/types";
import { useActivitiesStore } from "@/frontend/store/useActivitiesStore";
import { Spinner } from "@/frontend/components/ui/Spinner";
import { Avatar } from "@/frontend/components/ui/Avatar";

interface ReportsViewProps {
  payload: PortfolioPayload;
}

interface WeekInfo {
  key: string;
  monday: Date;
  sunday: Date;
  isoFrom: string;
  isoTo: string;
  isCurrent: boolean;
}

const WEEKS_BACK = 8;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function weekKey(monday: Date): string {
  const target = new Date(
    Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()),
  );
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const yearOfThursday = new Date(firstThursday).getUTCFullYear();
  return `${yearOfThursday}-W${pad2(weekNum)}`;
}

function startOfWeekMonday(d: Date): Date {
  const dayOfWeek = d.getDay();
  const offset = (dayOfWeek + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildWeeks(now: Date): WeekInfo[] {
  const currentMonday = startOfWeekMonday(now);
  const out: WeekInfo[] = [];
  for (let i = 0; i < WEEKS_BACK; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - 7 * i);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    out.push({
      key: weekKey(monday),
      monday,
      sunday,
      isoFrom: isoDate(monday),
      isoTo: isoDate(sunday),
      isCurrent: i === 0,
    });
  }
  return out;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtRange(monday: Date, sunday: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.toLocaleDateString("en-GB", opts)}`;
  }
  return `${monday.toLocaleDateString("en-GB", opts)} – ${sunday.toLocaleDateString("en-GB", opts)}`;
}

function dayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

export function ReportsView({ payload }: ReportsViewProps) {
  const bySubProjectId = useActivitiesStore((s) => s.bySubProjectId);
  const status = useActivitiesStore((s) => s.status);
  const load = useActivitiesStore((s) => s.load);

  const now = useMemo(() => new Date(), []);
  const weeks = useMemo(() => buildWeeks(now), [now]);
  const earliest = weeks[weeks.length - 1]?.isoFrom ?? isoDate(now);
  const latest = weeks[0]?.isoTo ?? isoDate(now);

  const allSubs = useMemo(
    () => payload.projects.flatMap((p) => p.subProjects),
    [payload.projects],
  );

  useEffect(() => {
    for (const sub of allSubs) {
      load(sub.id, earliest, latest).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.board.id, earliest, latest]);

  const firstKey = weeks[0]?.key ?? "";
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(firstKey ? [firstKey] : []),
  );

  function toggleWeek(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) next.add(key);
      return next;
    });
  }
  function selectThisWeek() {
    if (firstKey) setSelectedKeys(new Set([firstKey]));
  }
  function selectLast4() {
    setSelectedKeys(new Set(weeks.slice(0, 4).map((w) => w.key)));
  }
  function selectAll() {
    setSelectedKeys(new Set(weeks.map((w) => w.key)));
  }

  const allActivities: Activity[] = useMemo(
    () => allSubs.flatMap((sub) => bySubProjectId[sub.id] ?? []),
    [allSubs, bySubProjectId],
  );

  const weeksWithActs = useMemo(() => {
    return weeks.map((w) => {
      const acts = allActivities.filter((a) => {
        const day = dateOf(a.occursAt);
        return day >= w.isoFrom && day <= w.isoTo;
      });
      return { ...w, acts };
    });
  }, [weeks, allActivities]);

  const selectedWeeks = weeksWithActs.filter((w) => selectedKeys.has(w.key));

  const allAct = selectedWeeks.flatMap((w) => w.acts);
  const byType: Record<ActivityType, number> = {
    meeting: 0,
    milestone: 0,
    progress: 0,
    note: 0,
    block: 0,
  };
  for (const a of allAct) byType[a.type]++;

  const byUser = new Map<string, number>();
  for (const a of allAct) {
    if (!a.authorId) continue;
    byUser.set(a.authorId, (byUser.get(a.authorId) ?? 0) + 1);
  }
  const topUsers = [...byUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const subToProject = useMemo(() => {
    const map = new Map<string, ProjectWithSubs>();
    for (const p of payload.projects) {
      for (const s of p.subProjects) map.set(s.id, p);
    }
    return map;
  }, [payload.projects]);

  const usersById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const m of payload.members) map.set(m.id, m);
    return map;
  }, [payload.members]);

  const isOnlyThisWeek =
    selectedKeys.size === 1 && firstKey !== "" && selectedKeys.has(firstKey);
  const isLast4 =
    selectedKeys.size === 4 &&
    weeks.slice(0, 4).every((w) => selectedKeys.has(w.key));
  const isAll = selectedKeys.size === weeks.length;

  return (
    <div className="reports-view">
      <div className="rep-head">
        <h2>รายงานกิจกรรม</h2>
        <p>เลือกสัปดาห์ที่ต้องการดู — คลิกเพื่อเลือก/ยกเลิก, เลือกได้หลายสัปดาห์</p>
      </div>

      <div className="rep-week-selector">
        <div className="rep-week-quick">
          <button
            className={`rep-quick-btn${isOnlyThisWeek ? " active" : ""}`}
            onClick={selectThisWeek}
          >
            สัปดาห์นี้
          </button>
          <button
            className={`rep-quick-btn${isLast4 ? " active" : ""}`}
            onClick={selectLast4}
          >
            4 สัปดาห์ล่าสุด
          </button>
          <button
            className={`rep-quick-btn${isAll ? " active" : ""}`}
            onClick={selectAll}
          >
            ทั้งหมด ({weeks.length})
          </button>
          <span className="rep-quick-sep" />
          <span className="rep-quick-info">
            เลือกแล้ว <b>{selectedKeys.size}</b> สัปดาห์ ·{" "}
            <b>{allAct.length}</b> กิจกรรม
          </span>
          {status === "loading" && <Spinner size={14} />}
        </div>

        <div className="rep-week-strip">
          {[...weeksWithActs].reverse().map((w) => {
            const selected = selectedKeys.has(w.key);
            return (
              <button
                key={w.key}
                className={`rep-week-chip${selected ? " selected" : ""}${
                  w.isCurrent ? " current" : ""
                }`}
                onClick={() => toggleWeek(w.key)}
                title={fmtRange(w.monday, w.sunday)}
              >
                <span className="rep-chip-num">{w.key.slice(-3)}</span>
                <span className="rep-chip-range">{fmtShort(w.monday)}</span>
                {w.acts.length > 0 && (
                  <span className="rep-chip-count">{w.acts.length}</span>
                )}
                {w.isCurrent && <span className="rep-chip-current">วันนี้</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rep-summary">
        <div className="rep-summary-card big">
          <span className="rep-card-lbl">Activities</span>
          <span className="rep-card-val">{allAct.length}</span>
          <span className="rep-card-sub">
            ใน {selectedKeys.size} สัปดาห์ที่เลือก
          </span>
        </div>

        <div className="rep-summary-types">
          {ACTIVITY_TYPE_VALUES.map((k) => {
            const t = ACTIVITY_TYPE_META[k];
            return (
              <div
                key={k}
                className="rep-type-card"
                style={{ background: t.bg }}
              >
                <span className="rep-type-icon" style={{ color: t.fg }}>
                  {t.icon}
                </span>
                <span className="rep-type-count" style={{ color: t.fg }}>
                  {byType[k]}
                </span>
                <span className="rep-type-label">{t.label}</span>
              </div>
            );
          })}
        </div>

        <div className="rep-top-users">
          <div className="rep-card-lbl" style={{ marginBottom: 8 }}>
            Top contributors
          </div>
          {topUsers.length === 0 && (
            <div style={{ color: "var(--ink-3)", fontSize: 12 }}>—</div>
          )}
          {topUsers.map(([uid, count]) => {
            const u = usersById.get(uid);
            if (!u) return null;
            const pct = allAct.length > 0
              ? Math.round((count / allAct.length) * 100)
              : 0;
            return (
              <div key={uid} className="rep-user-row">
                <Avatar
                  name={u.name}
                  initials={u.initials}
                  color={u.color}
                  size={22}
                />
                <span className="rep-user-name">{u.name}</span>
                <div className="rep-user-bar">
                  <div
                    className="rep-user-bar-fill"
                    style={{ width: `${pct}%`, background: u.color }}
                  />
                </div>
                <span className="rep-user-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rep-weeks">
        {selectedWeeks.map((w) => {
          const typeCounts: Record<ActivityType, number> = {
            meeting: 0,
            milestone: 0,
            progress: 0,
            note: 0,
            block: 0,
          };
          for (const a of w.acts) typeCounts[a.type]++;

          const groupedByDay = new Map<string, Activity[]>();
          for (const a of w.acts) {
            const day = dateOf(a.occursAt);
            const list = groupedByDay.get(day) ?? [];
            list.push(a);
            groupedByDay.set(day, list);
          }

          const sortedDays = [...groupedByDay.entries()].sort((a, b) =>
            b[0].localeCompare(a[0]),
          );

          return (
            <div
              key={w.key}
              className={`rep-week${w.isCurrent ? " current" : ""}`}
            >
              <div className="rep-week-head">
                <div className="rep-week-title">
                  <span className="rep-week-num">{w.key}</span>
                  <span className="rep-week-range">
                    {fmtRange(w.monday, w.sunday)}
                  </span>
                  {w.isCurrent && (
                    <span className="rep-week-current">สัปดาห์นี้</span>
                  )}
                </div>
                <div className="rep-week-pills">
                  {ACTIVITY_TYPE_VALUES.map((k) => {
                    if (typeCounts[k] === 0) return null;
                    const t = ACTIVITY_TYPE_META[k];
                    return (
                      <span
                        key={k}
                        className="rep-week-pill"
                        style={{ background: t.bg, color: t.fg }}
                      >
                        <span
                          className="rep-week-pill-dot"
                          style={{ background: t.fg }}
                        />
                        {typeCounts[k]} {t.label}
                      </span>
                    );
                  })}
                  <span className="rep-week-total">
                    {w.acts.length} กิจกรรม
                  </span>
                </div>
              </div>

              {w.acts.length === 0 ? (
                <div className="rep-empty">ไม่มีกิจกรรมในสัปดาห์นี้</div>
              ) : (
                <div className="rep-week-body">
                  {sortedDays.map(([date, acts]) => (
                    <div key={date} className="rep-day">
                      <div className="rep-day-label">{dayName(date)}</div>
                      <div className="rep-day-acts">
                        {acts
                          .sort((a, b) => a.occursAt.localeCompare(b.occursAt))
                          .map((a) => {
                            const t = ACTIVITY_TYPE_META[a.type];
                            const user = a.authorId
                              ? usersById.get(a.authorId)
                              : null;
                            const proj = subToProject.get(a.subProjectId);
                            return (
                              <div key={a.id} className="rep-act">
                                <span className="rep-act-time">
                                  {timeOf(a.occursAt)}
                                </span>
                                <span
                                  className="rep-act-type-chip"
                                  style={{ background: t.bg, color: t.fg }}
                                >
                                  <span className="rep-act-type-icon">
                                    {t.icon}
                                  </span>
                                  {t.label}
                                </span>
                                <div className="rep-act-body">
                                  <div className="rep-act-title">{a.title}</div>
                                  {a.body && (
                                    <div className="rep-act-desc">{a.body}</div>
                                  )}
                                  <div className="rep-act-meta">
                                    {user && (
                                      <span className="rep-act-user">
                                        <Avatar
                                          name={user.name}
                                          initials={user.initials}
                                          color={user.color}
                                          size={18}
                                        />
                                        {user.name}
                                      </span>
                                    )}
                                    {proj && (
                                      <span
                                        className="rep-act-proj"
                                        style={{
                                          borderColor: proj.color,
                                          color: proj.color,
                                        }}
                                      >
                                        <span
                                          className="rep-act-proj-dot"
                                          style={{ background: proj.color }}
                                        />
                                        {proj.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
