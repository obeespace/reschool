import fs from "fs";
import path from "path";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── scores/view ──────────────────────────────────────────────────────────
write("app/api/scores/view/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const termId = searchParams.get("termId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    let filter: Record<string, unknown> = { schoolId };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    if (subjectId) filter.subjectId = new mongoose.Types.ObjectId(subjectId);

    if (termId) {
      const term = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termId) }).lean();
      if (term) {
        filter.term = term.termNumber;
        filter.academicYearId = term.academicYearId;
      }
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) {
        filter.term = activeTerm.termNumber;
        filter.academicYearId = activeTerm.academicYearId;
      }
    }

    const scores = await Score.find(filter).lean();

    const studentIds = [...new Set(scores.map((s) => s.studentId.toString()))];
    const subjectIds = [...new Set(scores.map((s) => s.subjectId.toString()))];

    const [students, subjects] = await Promise.all([
      studentIds.length ? Student.find({ _id: { $in: studentIds } }).select("_id fullName admissionNumber").lean() : [],
      subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }).select("_id name").lean() : [],
    ]);

    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));

    return NextResponse.json({
      scores: scores.map((s) => {
        const student = studentMap.get(s.studentId.toString());
        const subject = subjectMap.get(s.subjectId.toString());
        return {
          _id: s._id.toString(),
          studentId: s.studentId.toString(),
          studentName: student?.fullName || "Unknown",
          admissionNumber: student?.admissionNumber || "",
          subjectId: s.subjectId.toString(),
          subjectName: subject?.name || "Unknown",
          classwork: s.classwork ?? null,
          homework: s.homework ?? null,
          test: s.test ?? null,
          exam: s.exam ?? null,
          total: s.total ?? null,
          score: s.total ?? null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch scores" }, { status: 500 });
  }
}
`);

// ─── scores/upload ────────────────────────────────────────────────────────
write("app/api/scores/upload/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import TeacherProfile from "@/app/models/TeacherProfile";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const subjectId = String(body?.subjectId || "").trim();
    const classId = String(body?.classId || "").trim();
    const scoreValue = Number(body?.score);
    const scoreType = String(body?.scoreType || "exam").toLowerCase(); // classwork|homework|test|exam

    if (!studentId || !subjectId || !classId || !Number.isFinite(scoreValue)) {
      return NextResponse.json({ error: "studentId, subjectId, classId, and score are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const profile = await TeacherProfile.findOne({ schoolId, userId: new mongoose.Types.ObjectId(teacher.userId) }).lean();
    if (!profile) return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });

    const allowed = (profile.subjectsAndClasses || []).some(
      (s: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) =>
        s.subjectId.toString() === subjectId && s.classIds.map((id: mongoose.Types.ObjectId) => id.toString()).includes(classId)
    );
    if (!allowed) return NextResponse.json({ error: "You are not assigned to this subject/class combination" }, { status: 403 });

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term found" }, { status: 400 });
    if (!activeTerm.isPaid) return NextResponse.json({ error: "Term subscription not paid" }, { status: 400 });
    if (activeTerm.isClosed) return NextResponse.json({ error: "Term is closed, scores cannot be modified" }, { status: 400 });

    const validFields = ["classwork", "homework", "test", "exam", "extracurricular"];
    const field = validFields.includes(scoreType) ? scoreType : "exam";

    const existing = await Score.findOne({
      schoolId, studentId: new mongoose.Types.ObjectId(studentId),
      subjectId: new mongoose.Types.ObjectId(subjectId),
      classId: new mongoose.Types.ObjectId(classId),
      term: activeTerm.termNumber,
      academicYearId: activeTerm.academicYearId,
    }).lean();

    const currentScores = existing || {};
    const updatedScores = {
      classwork: (currentScores as Record<string, number>).classwork ?? 0,
      homework: (currentScores as Record<string, number>).homework ?? 0,
      test: (currentScores as Record<string, number>).test ?? 0,
      exam: (currentScores as Record<string, number>).exam ?? 0,
      extracurricular: (currentScores as Record<string, number>).extracurricular ?? 0,
      [field]: scoreValue,
    };
    const total = Object.values(updatedScores).reduce((a, b) => a + b, 0);

    const updated = await Score.findOneAndUpdate(
      {
        schoolId, studentId: new mongoose.Types.ObjectId(studentId),
        subjectId: new mongoose.Types.ObjectId(subjectId),
        classId: new mongoose.Types.ObjectId(classId),
        term: activeTerm.termNumber,
        academicYearId: activeTerm.academicYearId,
      },
      { $set: { ...updatedScores, total, teacherId: new mongoose.Types.ObjectId(teacher.userId) } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Score uploaded successfully", scoreId: updated._id.toString(), total, score: total });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to upload score" }, { status: 500 });
  }
}
`);

// ─── scores/daily-marks/create ────────────────────────────────────────────
write("app/api/scores/daily-marks/create/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const classId = String(body?.classId || "").trim();
    const subjectId = String(body?.subjectId || "").trim();
    const score = Number(body?.score);
    const assessmentType = String(body?.assessmentType || body?.type || "CLASSWORK").toUpperCase().trim();
    const assessmentDate = body?.assessmentDate ? new Date(body.assessmentDate) : new Date();
    const notes = String(body?.notes || "").trim();

    if (!studentId || !classId || !subjectId || !Number.isFinite(score)) {
      return NextResponse.json({ error: "studentId, classId, subjectId, and score are required" }, { status: 400 });
    }

    const validTypes = ["CLASSWORK", "HOMEWORK", "EVALUATION", "EXAM"];
    if (!validTypes.includes(assessmentType)) {
      return NextResponse.json({ error: \`assessmentType must be one of: \${validTypes.join(", ")}\` }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term found" }, { status: 400 });
    if (!activeTerm.isPaid) return NextResponse.json({ error: "Term subscription not paid" }, { status: 400 });
    if (activeTerm.isClosed) return NextResponse.json({ error: "Term is closed" }, { status: 400 });

    const doc = await DailyMark.create({
      schoolId,
      studentId: new mongoose.Types.ObjectId(studentId),
      classId: new mongoose.Types.ObjectId(classId),
      subjectId: new mongoose.Types.ObjectId(subjectId),
      teacherId: new mongoose.Types.ObjectId(teacher.userId),
      termId: activeTerm._id,
      academicYearId: activeTerm.academicYearId,
      assessmentType,
      score,
      assessmentDate,
      notes: notes || undefined,
    });

    return NextResponse.json({ message: "Daily mark created", id: doc._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create daily mark" }, { status: 500 });
  }
}
`);

// ─── scores/daily-marks/list ──────────────────────────────────────────────
write("app/api/scores/daily-marks/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
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

    const filter: Record<string, unknown> = { schoolId };
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const studentId = searchParams.get("studentId");
    const assessmentType = searchParams.get("assessmentType");
    const termId = searchParams.get("termId");

    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    if (subjectId) filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    if (studentId) filter.studentId = new mongoose.Types.ObjectId(studentId);
    if (assessmentType) filter.assessmentType = assessmentType.toUpperCase();

    if (termId) {
      filter.termId = new mongoose.Types.ObjectId(termId);
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) filter.termId = activeTerm._id;
    }

    const marks = await DailyMark.find(filter).sort({ assessmentDate: -1 }).lean();

    const studentIds = [...new Set(marks.map((m) => m.studentId.toString()))];
    const subjectIds = [...new Set(marks.map((m) => m.subjectId.toString()))];

    const [students, subjects] = await Promise.all([
      studentIds.length ? Student.find({ _id: { $in: studentIds } }).select("_id fullName").lean() : [],
      subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }).select("_id name").lean() : [],
    ]);

    const studentMap = new Map(students.map((s) => [s._id.toString(), s.fullName]));
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    return NextResponse.json({
      dailyMarks: marks.map((m) => ({
        _id: m._id.toString(),
        studentId: m.studentId.toString(),
        studentName: studentMap.get(m.studentId.toString()) || "Unknown",
        subjectId: m.subjectId.toString(),
        subjectName: subjectMap.get(m.subjectId.toString()) || "Unknown",
        classId: m.classId.toString(),
        assessmentType: m.assessmentType,
        score: m.score,
        assessmentDate: m.assessmentDate,
        notes: m.notes || null,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list daily marks" }, { status: 500 });
  }
}
`);

// ─── scores/daily-marks/bulk-upsert ──────────────────────────────────────
write("app/api/scores/daily-marks/bulk-upsert/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const entries: Array<{studentId: string; classId: string; subjectId: string; score: number; assessmentType?: string; assessmentDate?: string; notes?: string}> = Array.isArray(body?.entries) ? body.entries : [];
    if (!entries.length) return NextResponse.json({ error: "entries array is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term" }, { status: 400 });
    if (!activeTerm.isPaid) return NextResponse.json({ error: "Term not paid" }, { status: 400 });
    if (activeTerm.isClosed) return NextResponse.json({ error: "Term is closed" }, { status: 400 });

    const validTypes = ["CLASSWORK", "HOMEWORK", "EVALUATION", "EXAM"];
    const ops = entries.map((entry) => {
      const assessmentType = (entry.assessmentType || "CLASSWORK").toUpperCase().trim();
      const safeType = validTypes.includes(assessmentType) ? assessmentType : "CLASSWORK";
      const filter = {
        schoolId,
        studentId: new mongoose.Types.ObjectId(entry.studentId),
        classId: new mongoose.Types.ObjectId(entry.classId),
        subjectId: new mongoose.Types.ObjectId(entry.subjectId),
        termId: activeTerm._id,
        assessmentType: safeType,
        assessmentDate: entry.assessmentDate ? new Date(entry.assessmentDate) : new Date(),
      };
      const update = {
        $set: {
          score: Number(entry.score),
          teacherId: new mongoose.Types.ObjectId(teacher.userId),
          academicYearId: activeTerm.academicYearId,
          notes: entry.notes || null,
        },
      };
      return { updateOne: { filter, update, upsert: true } };
    });

    const result = await DailyMark.bulkWrite(ops);
    return NextResponse.json({ message: "Bulk upsert complete", upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bulk upsert failed" }, { status: 500 });
  }
}
`);

// ─── scores/daily-marks/edit ──────────────────────────────────────────────
write("app/api/scores/daily-marks/edit/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const id = String(body?.id || body?.markId || "").trim();
    const score = Number(body?.score);
    const notes = body?.notes !== undefined ? String(body.notes).trim() : undefined;

    if (!id || !Number.isFinite(score)) return NextResponse.json({ error: "id and score are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm?.isPaid) return NextResponse.json({ error: "Term subscription not paid" }, { status: 400 });
    if (activeTerm?.isClosed) return NextResponse.json({ error: "Term is closed" }, { status: 400 });

    const mark = await DailyMark.findOne({ _id: new mongoose.Types.ObjectId(id), schoolId });
    if (!mark) return NextResponse.json({ error: "Daily mark not found" }, { status: 404 });

    if (!Array.isArray(mark.modificationHistory)) mark.modificationHistory = [];
    mark.modificationHistory.push({ previousScore: mark.score, editedBy: new mongoose.Types.ObjectId(teacher.userId), editedAt: new Date() });
    mark.score = score;
    if (notes !== undefined) mark.notes = notes;
    await mark.save();

    return NextResponse.json({ message: "Daily mark updated", id });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to edit daily mark" }, { status: 500 });
  }
}

export async function PUT(req: Request) { return PATCH(req); }
`);

// ─── scores/daily-marks/clear ─────────────────────────────────────────────
write("app/api/scores/daily-marks/clear/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const subjectId = String(body?.subjectId || "").trim();
    const assessmentType = body?.assessmentType ? String(body.assessmentType).toUpperCase().trim() : null;
    const assessmentDate = body?.assessmentDate ? new Date(body.assessmentDate) : null;

    if (!classId || !subjectId) return NextResponse.json({ error: "classId and subjectId are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term" }, { status: 400 });
    if (activeTerm.isClosed) return NextResponse.json({ error: "Term is closed" }, { status: 400 });

    const filter: Record<string, unknown> = {
      schoolId,
      classId: new mongoose.Types.ObjectId(classId),
      subjectId: new mongoose.Types.ObjectId(subjectId),
      termId: activeTerm._id,
      teacherId: new mongoose.Types.ObjectId(teacher.userId),
    };
    if (assessmentType) filter.assessmentType = assessmentType;
    if (assessmentDate) filter.assessmentDate = assessmentDate;

    const result = await DailyMark.deleteMany(filter);
    return NextResponse.json({ message: "Daily marks cleared", deleted: result.deletedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to clear daily marks" }, { status: 500 });
  }
}

export async function DELETE(req: Request) { return POST(req); }
`);

console.log("\\n✅ Batch 4 done: scores (view, upload) + daily-marks (create, list, bulk-upsert, edit, clear)");
