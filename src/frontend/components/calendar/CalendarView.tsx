import { useState, useEffect, useMemo } from "react";
import type {
  PortfolioPayload,
  Activity,
  SubProjectWithRelations,
  ProjectWithSubs,
} from "@/types";
import { useActivitiesStore } from "@/frontend/store/useActivitiesStore";
import { ActivityChip } from "@/frontend/components/calendar/ActivityChip";
import { ActivityModal } from "@/frontend/components/calendar/ActivityModal";
import { Spinner } from "@/frontend/components/ui/Spinner";

interface CalendarViewProps {
  payload: PortfolioPayload;
  readOnly: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

type EditState =
  | { mode: "edit"; activity: Activity }
  | { mode: "new"; defaultIso: string }
  | null;

export function CalendarView({ payload, readOnly }: CalendarViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [editState, setEditState] = useState<EditState>(null);

  const bySubProjectId = useActivitiesStore((s) => s.bySubProjectId);
  const status = useActivitiesStore((s) => s.status);
  const loadActivities = useActivitiesStore((s) => s.load);

  const allSubs: SubProjectWithRelations[] = useMemo(
    () => payload.projects.flatMap((p) => p.subProjects),
    [payload.projects],
  );

  const subToProject = useMemo(() => {
    const map = new Map<string, ProjectWithSubs>();
    for (const p of payload.projects) {
      for (const s of p.subProjects) map.set(s.id, p);
    }
    return map;
  }, [payload.projects]);

  // Load activities for ALL sub-projects in the visible month
  useEffect(() => {
    const fromDate = `${year}-${pad2(month + 1)}-01`;
    const lastDay = getDaysInMonth(year, month);
    const toDate = `${year}-${pad2(month + 1)}-${pad2(lastDay)}`;
    for (const sub of allSubs) {
      loadActivities(sub.id, fromDate, toDate).catch(() => undefined);
    }
  }, [year, month, allSubs, loadActivities]);

  const activitiesByDay = useMemo(() => {
    const map = new Map<number, Activity[]>();
    for (const sub of allSubs) {
      const list = bySubProjectId[sub.id] ?? [];
      for (const act of list) {
        const d = new Date(act.occursAt);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          const arr = map.get(day) ?? [];
          arr.push(act);
          map.set(day, arr);
        }
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.occursAt.localeCompare(b.occursAt));
    }
    return map;
  }, [allSubs, bySubProjectId, year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  }
  function jumpToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function openNewForDay(day: number) {
    if (readOnly || allSubs.length === 0) return;
    const iso = `${year}-${pad2(month + 1)}-${pad2(day)}T09:00`;
    setEditState({ mode: "new", defaultIso: iso });
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button
          className="calendar-nav-btn"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="calendar-month-label">
          {THAI_MONTHS[month]} {year}
        </span>
        <button
          className="calendar-nav-btn"
          onClick={nextMonth}
          aria-label="Next month"
        >
          ›
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginLeft: 8 }}
          onClick={jumpToday}
        >
          วันนี้ / Today
        </button>
        {status === "loading" && (
          <span style={{ marginLeft: 8 }}>
            <Spinner size={14} />
          </span>
        )}
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}

        {Array.from({ length: firstWeekday }).map((_, i) => {
          const day = prevMonthDays - firstWeekday + 1 + i;
          return (
            <div key={`prev-${i}`} className="calendar-day other-month">
              <div className="calendar-day-num">{day}</div>
            </div>
          );
        })}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayActivities = activitiesByDay.get(day) ?? [];
          const isToday =
            day === now.getDate() &&
            month === now.getMonth() &&
            year === now.getFullYear();

          return (
            <div
              key={day}
              className={`calendar-day${isToday ? " today" : ""}`}
              onClick={() => openNewForDay(day)}
            >
              <div className="calendar-day-num">{day}</div>
              {dayActivities.map((act) => {
                const project = subToProject.get(act.subProjectId);
                return (
                  <ActivityChip
                    key={act.id}
                    activity={act}
                    projectColor={project?.color}
                    onClick={() =>
                      setEditState({ mode: "edit", activity: act })
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {editState?.mode === "new" && (
        <ActivityModal
          subProjects={allSubs}
          projects={payload.projects}
          defaultOccursAt={editState.defaultIso}
          onClose={() => setEditState(null)}
        />
      )}
      {editState?.mode === "edit" && (
        <ActivityModal
          subProjects={allSubs}
          projects={payload.projects}
          activity={editState.activity}
          onClose={() => setEditState(null)}
        />
      )}
    </div>
  );
}
