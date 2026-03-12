export type DurationUnit = "minutes" | "hours" | "days" | "weeks" | "months" | "years";

export const UNIT_TO_MINUTES: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 43200, // 30 days
  years: 525600, // 365 days
};

export const DURATION_UNITS: DurationUnit[] = [
  "minutes",
  "hours",
  "days",
  "weeks",
  "months",
  "years",
];

/** Convert a value + unit to total minutes. */
export function toMinutes(value: number, unit: DurationUnit): number {
  return Math.round(value * UNIT_TO_MINUTES[unit]);
}

/** Find the best unit for a given number of minutes (largest unit that divides evenly). */
export function bestUnit(totalMinutes: number): { value: number; unit: DurationUnit } {
  if (totalMinutes <= 0) return { value: 0, unit: "minutes" };

  // Check from largest to smallest
  for (let i = DURATION_UNITS.length - 1; i >= 0; i--) {
    const unit = DURATION_UNITS[i];
    const factor = UNIT_TO_MINUTES[unit];
    if (totalMinutes >= factor && totalMinutes % factor === 0) {
      return { value: totalMinutes / factor, unit };
    }
  }

  // Fallback: use the largest unit where value >= 1, truncating remainder
  for (let i = DURATION_UNITS.length - 1; i >= 0; i--) {
    const unit = DURATION_UNITS[i];
    const factor = UNIT_TO_MINUTES[unit];
    const val = Math.floor(totalMinutes / factor);
    if (val >= 1) {
      return { value: val, unit };
    }
  }

  return { value: totalMinutes, unit: "minutes" };
}

/** Format minutes into a human-readable string like "6h 30m", "3d", "2y". */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";

  const years   = Math.floor(totalMinutes / 525600);
  const rem1    = totalMinutes % 525600;
  const months  = Math.floor(rem1 / 43200);
  const rem2    = rem1 % 43200;
  const weeks   = Math.floor(rem2 / 10080);
  const rem3    = rem2 % 10080;
  const days    = Math.floor(rem3 / 1440);
  const rem4    = rem3 % 1440;
  const hours   = Math.floor(rem4 / 60);
  const minutes = rem4 % 60;

  // Show at most two units for readability
  const parts: string[] = [];
  if (years > 0)   parts.push(`${years}y`);
  if (months > 0 && parts.length < 2) parts.push(`${months}mo`);
  if (weeks > 0  && parts.length < 2) parts.push(`${weeks}w`);
  if (days > 0   && parts.length < 2) parts.push(`${days}d`);
  if (hours > 0  && parts.length < 2) parts.push(`${hours}h`);
  if (minutes > 0 && parts.length < 2) parts.push(`${minutes}m`);

  return parts.join(" ") || "0m";
}

/** Format a countdown in seconds to a human-readable string. */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 && parts.length < 2) parts.push(`${hours}h`);
  if (minutes > 0 && parts.length < 2) parts.push(`${minutes}m`);

  return parts.join(" ") || "< 1m";
}

/** Format a cooldown range for display (e.g. "4h - 6h", "6mo - 1y"). */
export function formatCooldownRange(min: number, max: number): string {
  if (min === max) return formatDuration(min);
  return `${formatDuration(min)} - ${formatDuration(max)}`;
}
