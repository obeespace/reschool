import type { D1Client } from "@/app/db/client";
import {
  announcements,
  attendanceRecords,
  auditLogs,
  dailyMarks,
  teacherRemarks,
  terms,
  users,
} from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export type TeacherRewardBreakdown = {
  marksPoints: number;
  attendancePoints: number;
  remarksPoints: number;
  announcementsPoints: number;
  appActivityPoints: number;
  frequencyPoints: number;
  timelinessPoints: number;
  consistencyPoints: number;
  qualityPoints: number;
};

export type TeacherRewardEntry = {
  teacherId: string;
  teacherName: string;
  rank: number;
  points: number;
  lastActivityAt: Date | null;
  activeDays: number;
  marksRecorded: number;
  attendanceMarked: number;
  remarksRecorded: number;
  announcementsPosted: number;
  appEvents: number;
  averageScore: number;
  breakdown: TeacherRewardBreakdown;
};

function toDayKey(dateValue: Date | number | null | undefined): string | null {
  if (!dateValue) return null;
  const date = dateValue instanceof Date ? dateValue : new Date(Number(dateValue));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(date: Date | null, endMs: number): number {
  if (!date) return 999;
  return Math.max(0, Math.floor((endMs - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function deriveTimelinessPoints(lastActivityAt: Date | null, endMs: number): number {
  const lagDays = daysSince(lastActivityAt, endMs);
  if (lagDays <= 1) return 12;
  if (lagDays <= 3) return 9;
  if (lagDays <= 7) return 6;
  if (lagDays <= 14) return 3;
  return 0;
}

function deriveConsistencyPoints(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const byWeek = new Map<string, number>();

  for (const day of dayKeys) {
    const d = new Date(`${day}T00:00:00.000Z`);
    const weekKey = `${d.getUTCFullYear()}-${Math.ceil((d.getUTCDate() + (new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).getUTCDay() || 7) - 1) / 7)}`;
    byWeek.set(weekKey, (byWeek.get(weekKey) || 0) + 1);
  }

  const activeWeeks = [...byWeek.values()].filter((count) => count >= 2).length;
  return clamp(activeWeeks * 2, 0, 12);
}

export async function resolveTermWindow(
  d1: D1Client,
  schoolId: string,
  termIdQuery?: string
): Promise<{ termId: string | null; startMs: number; endMs: number }> {
  const termRows = termIdQuery
    ? await d1
        .select({ id: terms.id, startDate: terms.startDate, endDate: terms.endDate })
        .from(terms)
        .where(and(eq(terms.schoolId, schoolId), eq(terms.id, termIdQuery)))
        .limit(1)
    : await d1
        .select({ id: terms.id, startDate: terms.startDate, endDate: terms.endDate })
        .from(terms)
        .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
        .limit(1);

  const row = termRows[0];
  if (!row) {
    return { termId: null, startMs: 0, endMs: Date.now() };
  }

  const now = Date.now();
  return {
    termId: row.id,
    startMs: row.startDate ? new Date(row.startDate).getTime() : 0,
    endMs: row.endDate ? Math.min(new Date(row.endDate).getTime(), now) : now,
  };
}

export async function buildTeacherRewardsLeaderboard(
  d1: D1Client,
  schoolId: string,
  termId: string,
  limit: number
): Promise<TeacherRewardEntry[]> {
  const termWindowRows = await d1
    .select({ startDate: terms.startDate, endDate: terms.endDate })
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.id, termId)))
    .limit(1);

  const termStartMs = termWindowRows[0]?.startDate
    ? new Date(termWindowRows[0].startDate).getTime()
    : 0;
  const termEndMs = termWindowRows[0]?.endDate
    ? new Date(termWindowRows[0].endDate).getTime()
    : Date.now();

  const [teacherRows, markRows, attendanceRows, remarkRows, announcementRows, auditRows] = await Promise.all([
    d1
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "TEACHER"))),
    d1
      .select({
        teacherId: dailyMarks.teacherId,
        studentId: dailyMarks.studentId,
        score: dailyMarks.score,
        recordedDate: dailyMarks.recordedDate,
      })
      .from(dailyMarks)
      .where(and(eq(dailyMarks.schoolId, schoolId), eq(dailyMarks.termId, termId), eq(dailyMarks.isDeleted, false))),
    d1
      .select({ markedBy: attendanceRecords.markedBy, markedTime: attendanceRecords.markedTime })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.termId, termId))),
    d1
      .select({ remarkedBy: teacherRemarks.remarkedBy, remarkedDate: teacherRemarks.remarkedDate })
      .from(teacherRemarks)
      .where(and(eq(teacherRemarks.schoolId, schoolId), eq(teacherRemarks.termId, termId))),
    d1
      .select({ createdBy: announcements.createdBy, createdDate: announcements.createdDate })
      .from(announcements)
      .where(eq(announcements.schoolId, schoolId)),
    d1
      .select({ actorId: auditLogs.actorId, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(eq(auditLogs.schoolId, schoolId)),
  ]);

  const teacherName = new Map(teacherRows.map((t) => [t.id, t.name]));
  const teacherIds = new Set(teacherRows.map((t) => t.id));

  const bucket = new Map<
    string,
    {
      marksCount: number;
      attendanceCount: number;
      remarksCount: number;
      announcementsCount: number;
      appEventsCount: number;
      scoreSum: number;
      scoreCount: number;
      uniqueStudents: Set<string>;
      dayKeys: Set<string>;
      lastActivityMs: number;
    }
  >();

  const ensure = (teacherId: string) => {
    if (!bucket.has(teacherId)) {
      bucket.set(teacherId, {
        marksCount: 0,
        attendanceCount: 0,
        remarksCount: 0,
        announcementsCount: 0,
        appEventsCount: 0,
        scoreSum: 0,
        scoreCount: 0,
        uniqueStudents: new Set(),
        dayKeys: new Set(),
        lastActivityMs: 0,
      });
    }
    return bucket.get(teacherId)!;
  };

  for (const row of markRows) {
    if (!teacherIds.has(row.teacherId)) continue;
    const entry = ensure(row.teacherId);
    entry.marksCount += 1;
    entry.uniqueStudents.add(row.studentId);
    entry.scoreSum += Number(row.score) || 0;
    entry.scoreCount += 1;
    const ts = row.recordedDate ? new Date(row.recordedDate).getTime() : 0;
    const key = toDayKey(row.recordedDate);
    if (key) entry.dayKeys.add(key);
    entry.lastActivityMs = Math.max(entry.lastActivityMs, ts || 0);
  }

  for (const row of attendanceRows) {
    if (!teacherIds.has(row.markedBy)) continue;
    const entry = ensure(row.markedBy);
    entry.attendanceCount += 1;
    const ts = row.markedTime ? new Date(row.markedTime).getTime() : 0;
    const key = toDayKey(row.markedTime);
    if (key) entry.dayKeys.add(key);
    entry.lastActivityMs = Math.max(entry.lastActivityMs, ts || 0);
  }

  for (const row of remarkRows) {
    if (!teacherIds.has(row.remarkedBy)) continue;
    const entry = ensure(row.remarkedBy);
    entry.remarksCount += 1;
    const ts = row.remarkedDate ? new Date(row.remarkedDate).getTime() : 0;
    const key = toDayKey(row.remarkedDate);
    if (key) entry.dayKeys.add(key);
    entry.lastActivityMs = Math.max(entry.lastActivityMs, ts || 0);
  }

  for (const row of announcementRows) {
    if (!teacherIds.has(row.createdBy)) continue;
    const ts = row.createdDate ? new Date(row.createdDate).getTime() : 0;
    if (!ts || ts < termStartMs || ts > termEndMs) continue;
    const entry = ensure(row.createdBy);
    entry.announcementsCount += 1;
    const key = toDayKey(row.createdDate);
    if (key) entry.dayKeys.add(key);
    entry.lastActivityMs = Math.max(entry.lastActivityMs, ts || 0);
  }

  for (const row of auditRows) {
    if (!row.actorId || !teacherIds.has(row.actorId)) continue;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    if (!ts || ts < termStartMs || ts > termEndMs) continue;
    const entry = ensure(row.actorId);
    entry.appEventsCount += 1;
    const key = toDayKey(row.createdAt);
    if (key) entry.dayKeys.add(key);
    entry.lastActivityMs = Math.max(entry.lastActivityMs, ts || 0);
  }

  const now = Date.now();

  const entries = [...teacherIds].map((teacherId) => {
    const teacherBucket = ensure(teacherId);
    const averageScore = teacherBucket.scoreCount
      ? Number((teacherBucket.scoreSum / teacherBucket.scoreCount).toFixed(2))
      : 0;

    const marksPoints = clamp(teacherBucket.marksCount * 3, 0, 120);
    const attendancePoints = clamp(teacherBucket.attendanceCount * 1.5, 0, 40);
    const remarksPoints = clamp(teacherBucket.remarksCount * 2, 0, 40);
    const announcementsPoints = clamp(teacherBucket.announcementsCount * 2, 0, 20);
    const appActivityPoints = clamp(teacherBucket.appEventsCount * 0.5, 0, 20);
    const frequencyPoints = clamp(teacherBucket.dayKeys.size * 0.8, 0, 25);
    const timelinessPoints = deriveTimelinessPoints(
      teacherBucket.lastActivityMs ? new Date(teacherBucket.lastActivityMs) : null,
      now
    );
    const consistencyPoints = deriveConsistencyPoints([...teacherBucket.dayKeys]);
    const qualityPoints = clamp(averageScore * 0.2, 0, 20);

    const breakdown: TeacherRewardBreakdown = {
      marksPoints,
      attendancePoints,
      remarksPoints,
      announcementsPoints,
      appActivityPoints,
      frequencyPoints,
      timelinessPoints,
      consistencyPoints,
      qualityPoints,
    };

    const points = Number(
      (
        breakdown.marksPoints +
        breakdown.attendancePoints +
        breakdown.remarksPoints +
        breakdown.announcementsPoints +
        breakdown.appActivityPoints +
        breakdown.frequencyPoints +
        breakdown.timelinessPoints +
        breakdown.consistencyPoints +
        breakdown.qualityPoints
      ).toFixed(2)
    );

    return {
      teacherId,
      teacherName: teacherName.get(teacherId) || "Unknown Teacher",
      rank: 0,
      points,
      lastActivityAt: teacherBucket.lastActivityMs ? new Date(teacherBucket.lastActivityMs) : null,
      activeDays: teacherBucket.dayKeys.size,
      marksRecorded: teacherBucket.marksCount,
      attendanceMarked: teacherBucket.attendanceCount,
      remarksRecorded: teacherBucket.remarksCount,
      announcementsPosted: teacherBucket.announcementsCount,
      appEvents: teacherBucket.appEventsCount,
      averageScore,
      breakdown,
    } as TeacherRewardEntry;
  });

  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
    const aMs = a.lastActivityAt ? a.lastActivityAt.getTime() : 0;
    const bMs = b.lastActivityAt ? b.lastActivityAt.getTime() : 0;
    return bMs - aMs;
  });

  return entries.slice(0, limit).map((entry, index) => ({ ...entry, rank: index + 1 }));
}
