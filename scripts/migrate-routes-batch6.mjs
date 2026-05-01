import fs from "fs";
import path from "path";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── reports/list ─────────────────────────────────────────────────────────
write("app/api/reports/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import TeacherProfile from "@/app/models/TeacherProfile";
import ParentWardLink from "@/app/models/ParentWardLink";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const termId = searchParams.get("termId");
    const filter: Record<string, unknown> = { schoolId };

    if (termId) {
      filter.termId = new mongoose.Types.ObjectId(termId);
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) filter.termId = activeTerm._id;
    }

    if (user.role === "TEACHER") {
      const profile = await TeacherProfile.findOne({ schoolId, userId: new mongoose.Types.ObjectId(user.userId) }).lean();
      const allClassIds = new Set<string>();
      if (profile?.classTeacherOf) allClassIds.add(profile.classTeacherOf.toString());
      for (const e of profile?.subjectsAndClasses || []) {
        for (const cid of e.classIds || []) allClassIds.add(cid.toString());
      }
      if (allClassIds.size > 0) {
        filter.classId = { $in: [...allClassIds].map((id) => new mongoose.Types.ObjectId(id)) };
      }
    } else if (user.role === "PARENT") {
      const wardLinks = await ParentWardLink.find({ schoolId, parentId: new mongoose.Types.ObjectId(user.userId) }).lean();
      const wardIds = wardLinks.map((w) => w.studentId);
      filter.studentId = { $in: wardIds };
      filter.approvedBy = { $ne: null }; // Only released reports
    }

    const reports = await ReportCard.find(filter).lean();

    return NextResponse.json({
      reports: reports.map((r) => ({
        _id: r._id.toString(),
        studentId: r.studentId.toString(),
        classId: r.classId.toString(),
        termId: r.termId.toString(),
        subjectScores: r.subjectScores || [],
        totalScore: r.totalScore ?? null,
        average: r.average ?? null,
        position: r.position ?? null,
        isReleased: Boolean(r.approvedBy),
        approvedBy: r.approvedBy ? r.approvedBy.toString() : null,
        printCount: r.printCount ?? 0,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch reports" }, { status: 500 });
  }
}
`);

// ─── reports/release ──────────────────────────────────────────────────────
write("app/api/reports/release/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const termId = String(body?.termId || "").trim();
    const reportIds: string[] = Array.isArray(body?.reportIds) ? body.reportIds.map(String) : [];
    if (!termId) return NextResponse.json({ error: "termId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const approvedBy = new mongoose.Types.ObjectId(admin.userId);
    const now = new Date();

    let result;
    if (reportIds.length > 0) {
      result = await ReportCard.updateMany(
        { schoolId, _id: { $in: reportIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $set: { approvedBy, approvedAt: now } }
      );
    } else {
      result = await ReportCard.updateMany(
        { schoolId, termId: new mongoose.Types.ObjectId(termId) },
        { $set: { approvedBy, approvedAt: now } }
      );
    }

    return NextResponse.json({ message: "Reports released", count: result.modifiedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to release reports" }, { status: 500 });
  }
}

export async function PATCH(req: Request) { return POST(req); }
`);

// ─── reports/print ────────────────────────────────────────────────────────
write("app/api/reports/print/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const reportId = String(body?.reportId || body?.id || "").trim();
    if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const report = await ReportCard.findOne({ _id: new mongoose.Types.ObjectId(reportId), schoolId }).lean();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (!report.approvedBy) return NextResponse.json({ error: "Report has not been released" }, { status: 403 });

    await ReportCard.updateOne(
      { _id: report._id },
      {
        $inc: { printCount: 1 },
        $push: { printHistory: { printedBy: new mongoose.Types.ObjectId(user.userId), printedAt: new Date() } },
      }
    );

    return NextResponse.json({ message: "Print recorded", reportId, report });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record print" }, { status: 500 });
  }
}
`);

// ─── reports/generate-term-cards ─────────────────────────────────────────
write("app/api/reports/generate-term-cards/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const termId = String(body?.termId || "").trim();
    if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const term = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    // Aggregate DailyMarks by student + subject
    const marks = await DailyMark.aggregate([
      { $match: { schoolId, classId: new mongoose.Types.ObjectId(classId), termId: term._id } },
      {
        $group: {
          _id: { studentId: "$studentId", subjectId: "$subjectId" },
          avgScore: { $avg: "$score" },
          maxScore: { $max: "$score" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group by student
    const byStudent = new Map<string, Array<{subjectId: string; score: number; count: number}>>();
    for (const m of marks) {
      const sid = m._id.studentId.toString();
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid)!.push({ subjectId: m._id.subjectId.toString(), score: Math.round(m.avgScore), count: m.count });
    }

    const students = await Student.find({ schoolId, currentClassId: new mongoose.Types.ObjectId(classId) }).lean();
    let generated = 0;

    for (const student of students) {
      const sid = student._id.toString();
      const subjectScores = byStudent.get(sid) || [];
      const totalScore = subjectScores.reduce((a, b) => a + b.score, 0);
      const average = subjectScores.length > 0 ? Math.round(totalScore / subjectScores.length) : 0;

      await ReportCard.findOneAndUpdate(
        { schoolId, studentId: student._id, classId: new mongoose.Types.ObjectId(classId), termId: term._id },
        {
          $set: {
            academicYearId: term.academicYearId,
            subjectScores: subjectScores.map((s) => ({ subjectId: new mongoose.Types.ObjectId(s.subjectId), score: s.score })),
            totalScore,
            average,
          },
        },
        { upsert: true }
      );
      generated++;
    }

    // Assign positions within the class
    const reports = await ReportCard.find({ schoolId, classId: new mongoose.Types.ObjectId(classId), termId: term._id }).lean();
    const sorted = [...reports].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
    for (let i = 0; i < sorted.length; i++) {
      await ReportCard.updateOne({ _id: sorted[i]._id }, { $set: { position: i + 1 } });
    }

    return NextResponse.json({ message: "Term report cards generated", generated, classId, termId: term._id.toString() });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate term cards" }, { status: 500 });
  }
}
`);

// ─── parents/ward-scores ──────────────────────────────────────────────────
write("app/api/parents/ward-scores/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import DailyMark from "@/app/models/DailyMark";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    if (!wardIds.length) return NextResponse.json({ wards: [] });

    const termId = searchParams.get("termId");
    const termFilter = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();

    const students = await Student.find({ schoolId, _id: { $in: wardIds } }).lean();
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

    const marks = termFilter
      ? await DailyMark.aggregate([
          { $match: { schoolId, studentId: { $in: wardIds }, termId: termFilter._id } },
          { $group: { _id: { studentId: "$studentId", subjectId: "$subjectId" }, avg: { $avg: "$score" }, max: { $max: "$score" }, count: { $sum: 1 } } },
        ])
      : [];

    const subjectIds = [...new Set(marks.map((m) => m._id.subjectId.toString()))];
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    const byStudent = new Map<string, { studentId: string; fullName: string; scores: Array<{subjectId: string; subjectName: string; avg: number; max: number; count: number}> }>();
    for (const sid of wardIds) {
      byStudent.set(sid.toString(), { studentId: sid.toString(), fullName: studentMap.get(sid.toString())?.fullName || "Unknown", scores: [] });
    }
    for (const m of marks) {
      const sid = m._id.studentId.toString();
      byStudent.get(sid)?.scores.push({
        subjectId: m._id.subjectId.toString(),
        subjectName: subjectMap.get(m._id.subjectId.toString()) || "Unknown",
        avg: Math.round(m.avg),
        max: m.max,
        count: m.count,
      });
    }

    return NextResponse.json({ wards: [...byStudent.values()], termId: termFilter?._id.toString() || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch ward scores" }, { status: 500 });
  }
}
`);

// ─── parents/daily-marks ──────────────────────────────────────────────────
write("app/api/parents/daily-marks/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import DailyMark from "@/app/models/DailyMark";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    if (!wardIds.length) return NextResponse.json({ dailyMarks: [] });

    const termId = searchParams.get("termId");
    const studentId = searchParams.get("studentId");
    const termFilter = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();

    const filter: Record<string, unknown> = { schoolId, studentId: { $in: studentId ? [new mongoose.Types.ObjectId(studentId)] : wardIds } };
    if (termFilter) filter.termId = termFilter._id;

    const marks = await DailyMark.find(filter).sort({ assessmentDate: -1 }).lean();
    const subjectIds = [...new Set(marks.map((m) => m.subjectId.toString()))];
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    return NextResponse.json({
      dailyMarks: marks.map((m) => ({
        _id: m._id.toString(),
        studentId: m.studentId.toString(),
        subjectId: m.subjectId.toString(),
        subjectName: subjectMap.get(m.subjectId.toString()) || "Unknown",
        assessmentType: m.assessmentType,
        score: m.score,
        assessmentDate: m.assessmentDate,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parent daily marks" }, { status: 500 });
  }
}
`);

// ─── parents/academic-years ───────────────────────────────────────────────
write("app/api/parents/academic-years/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);

    const years = await AcademicYear.find({ schoolId }).sort({ createdAt: -1 }).lean();
    const terms = await Term.find({ schoolId }).lean();
    const termsByYear = new Map<string, typeof terms>();
    for (const t of terms) {
      const key = t.academicYearId.toString();
      if (!termsByYear.has(key)) termsByYear.set(key, []);
      termsByYear.get(key)!.push(t);
    }

    return NextResponse.json({
      academicYears: years.map((y) => ({
        _id: y._id.toString(),
        name: y.name,
        isActive: y.isActive,
        terms: (termsByYear.get(y._id.toString()) || []).map((t) => ({
          _id: t._id.toString(),
          termNumber: t.termNumber,
          isActive: t.isActive,
          isPaid: t.isPaid,
          isClosed: t.isClosed,
        })),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch academic years" }, { status: 500 });
  }
}
`);

// ─── parents/class-ranking ────────────────────────────────────────────────
write("app/api/parents/class-ranking/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    if (!wardIds.length) return NextResponse.json({ rankings: [] });

    const termId = searchParams.get("termId");
    const term = termId
      ? await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean()
      : await Term.findOne({ schoolId, isActive: true }).lean();
    if (!term) return NextResponse.json({ rankings: [] });

    const wardStudents = await Student.find({ schoolId, _id: { $in: wardIds } }).lean();
    const classIds = [...new Set(wardStudents.map((s) => s.currentClassId?.toString()).filter(Boolean))];

    const rankings = [];
    for (const classId of classIds) {
      const reports = await ReportCard.find({ schoolId, classId: new mongoose.Types.ObjectId(classId!), termId: term._id }).lean();
      if (!reports.length) continue;

      const sorted = [...reports].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
      const studentIds = sorted.map((r) => r.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).select("_id fullName").lean();
      const studentNameMap = new Map(students.map((s) => [s._id.toString(), s.fullName]));

      const myWardIds = new Set(wardIds.map((id) => id.toString()));

      rankings.push({
        classId,
        classTotal: sorted.length,
        ranking: sorted.map((r, index) => ({
          position: r.position ?? (index + 1),
          studentId: r.studentId.toString(),
          studentName: studentNameMap.get(r.studentId.toString()) || "Unknown",
          average: r.average ?? 0,
          isMyWard: myWardIds.has(r.studentId.toString()),
        })),
      });
    }

    return NextResponse.json({ rankings });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch class ranking" }, { status: 500 });
  }
}
`);

console.log("\\n✅ Batch 6 done: reports (list, release, print, generate-term-cards), parents (ward-scores, daily-marks, academic-years, class-ranking)");
