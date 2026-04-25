export interface WeekRange {
  weekStart: string;
  weekEnd: string;
}

export function startOfWeek(input: Date | string): Date {
  const date = new Date(input);
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  normalized.setDate(normalized.getDate() + diff);
  normalized.setHours(0, 0, 0, 0);

  return normalized;
}

export function endOfWeek(input: Date | string): Date {
  const date = startOfWeek(input);
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getWeekRange(input: Date | string): WeekRange {
  return {
    weekStart: startOfWeek(input).toISOString(),
    weekEnd: endOfWeek(input).toISOString()
  };
}

export function isWithinWeek(target: string, input: Date | string): boolean {
  const value = new Date(target).getTime();
  const start = startOfWeek(input).getTime();
  const end = endOfWeek(input).getTime();

  return value >= start && value <= end;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}

export function formatWeekLabel(weekStart: string, weekEnd: string): string {
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
}
