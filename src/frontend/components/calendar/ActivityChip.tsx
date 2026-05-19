import type { Activity } from "@/types";
import { ACTIVITY_TYPE_META } from "@/types";

interface ActivityChipProps {
  activity: Activity;
  projectColor?: string;
  onClick(): void;
}

export function ActivityChip({
  activity,
  projectColor,
  onClick,
}: ActivityChipProps) {
  const meta = ACTIVITY_TYPE_META[activity.type];

  return (
    <div
      className="activity-chip"
      style={{
        background: meta.bg,
        color: meta.fg,
        borderLeft: projectColor ? `3px solid ${projectColor}` : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      title={activity.title}
    >
      <span className="activity-chip-icon">{meta.icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {activity.title}
      </span>
    </div>
  );
}
