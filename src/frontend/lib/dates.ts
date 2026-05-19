import type { ISODateOnly, ISODateString } from "@/types";

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function formatDateOnly(date: ISODateOnly | null | undefined): string {
  if (!date) return "—";
  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return "—";
  const monthLabel = THAI_MONTHS[month - 1] ?? "";
  return `${day} ${monthLabel}`;
}

export function formatISODate(date: ISODateString | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const monthLabel = THAI_MONTHS[month] ?? "";
  return `${day} ${monthLabel} ${year}`;
}

export function todayDateOnly(): ISODateOnly {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isBefore(a: ISODateOnly, b: ISODateOnly): boolean {
  return a < b;
}

export function dateOnlyFromISO(iso: ISODateString): ISODateOnly {
  return iso.slice(0, 10);
}
