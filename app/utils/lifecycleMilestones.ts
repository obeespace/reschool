function safeDateLabel(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function parseMilestones(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function appendMilestone(milestones: string[], message: string): string[] {
  const trimmed = String(message || "").trim();
  if (!trimmed || milestones.includes(trimmed)) {
    return milestones;
  }
  return [...milestones, trimmed];
}

export function formatMilestone(message: string, date?: Date | string | number): string {
  return `${message} (${safeDateLabel(date || new Date())})`;
}