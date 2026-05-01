import fs from "fs";
import path from "path";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── attendance/mark ──────────────────────────────────────────────────────
write("app/api/attendance/mark/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
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

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const filter: Record<string, unknown> = { schoolId };
    if (activeTerm) filter.termId = activeTerm._id;

    const classId = searchParams.get("classId");
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);

    const dateStr = searchParams.get("date");
    if (dateStr) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.attendanceDate = { $gte: d, $lt: next };
    }

    const records = await AttendanceRecord.find(filter).lean();

    // Flatten records array into per-student rows for API compatibility
    const flat = records.flatMap((rec) =>
      (rec.records || []).map((r: {studentId: mongoose.Types.ObjectId; status: string; notes?: string}) => ({
        id: rec._id.toString() + "_" + r.studentId.toString(),
        classId: rec.classId.toString(),
        attendanceDate: rec.attendanceDate,
        studentId: r.studentId.toString(),
        status: r.status,
        notes: r.notes || null,
      }))
    );

    return NextResponse.json({ attendance: flat });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const dateStr = String(body?.date || body?.attendanceDate || new Date().toISOString().split("T")[0]);
    const records: Array<{studentId: string; status: string; notes?: string}> = Array.isArray(body?.records) ? body.records : [];

    if (!classId || !records.length) return NextResponse.json({ error: "classId and records are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term" }, { status: 400 });

    const attendanceDate = new Date(dateStr);
    attendanceDate.setHours(0, 0, 0, 0);

    const mongoRecords = records.map((r) => ({
      studentId: new mongoose.Types.ObjectId(r.studentId),
      status: r.status,
      notes: r.notes || null,
    }));

    await AttendanceRecord.findOneAndUpdate(
      { schoolId, classId: new mongoose.Types.ObjectId(classId), attendanceDate },
      {
        $set: {
          termId: activeTerm._id,
          academicYearId: activeTerm.academicYearId,
          takenBy: new mongoose.Types.ObjectId(teacher.userId),
          records: mongoRecords,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ message: "Attendance marked", classId, date: dateStr, count: records.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark attendance" }, { status: 500 });
  }
}
`);

// ─── attendance/dashboard ──────────────────────────────────────────────────
write("app/api/attendance/dashboard/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import Term from "@/app/models/Term";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ stats: { totalDays: 0, presentCount: 0, absentCount: 0, lateCount: 0, attendanceRate: 0 } });

    const classId = searchParams.get("classId");
    const filter: Record<string, unknown> = { schoolId, termId: activeTerm._id };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);

    const records = await AttendanceRecord.find(filter).lean();
    const totalDays = new Set(records.map((r) => r.attendanceDate.toISOString().split("T")[0])).size;

    let present = 0, absent = 0, late = 0;
    for (const rec of records) {
      for (const r of rec.records || []) {
        if (r.status === "PRESENT") present++;
        else if (r.status === "ABSENT") absent++;
        else if (r.status === "LATE") late++;
      }
    }

    const total = present + absent + late;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json({
      stats: { totalDays, presentCount: present, absentCount: absent, lateCount: late, attendanceRate },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch attendance dashboard" }, { status: 500 });
  }
}
`);

// ─── remarks/create ───────────────────────────────────────────────────────
write("app/api/remarks/create/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherRemark from "@/app/models/TeacherRemark";
import Student from "@/app/models/Students";
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
    const termId = searchParams.get("termId");
    const studentId = searchParams.get("studentId");

    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    if (studentId) filter.studentId = new mongoose.Types.ObjectId(studentId);
    if (termId) {
      filter.termId = new mongoose.Types.ObjectId(termId);
    } else {
      const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
      if (activeTerm) filter.termId = activeTerm._id;
    }

    const remarks = await TeacherRemark.find(filter).lean();
    const studentIds = [...new Set(remarks.map((r) => r.studentId.toString()))];
    const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).select("_id fullName").lean() : [];
    const studentMap = new Map(students.map((s) => [s._id.toString(), s.fullName]));

    return NextResponse.json({
      remarks: remarks.map((r) => ({
        _id: r._id.toString(),
        studentId: r.studentId.toString(),
        studentName: studentMap.get(r.studentId.toString()) || "Unknown",
        remark: r.remark,
        classId: r.classId?.toString() || null,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch remarks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const classId = String(body?.classId || "").trim();
    const remark = String(body?.remark || "").trim();

    if (!studentId || !remark) return NextResponse.json({ error: "studentId and remark are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();

    const doc = await TeacherRemark.create({
      schoolId,
      teacherId: new mongoose.Types.ObjectId(teacher.userId),
      studentId: new mongoose.Types.ObjectId(studentId),
      classId: classId ? new mongoose.Types.ObjectId(classId) : undefined,
      termId: activeTerm ? activeTerm._id : undefined,
      remark,
    });

    return NextResponse.json({ message: "Remark created", id: doc._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create remark" }, { status: 500 });
  }
}
`);

// ─── payments/initiate ────────────────────────────────────────────────────
write("app/api/payments/initiate/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const termId = String(body?.termId || "").trim();
    const paymentReference = String(body?.paymentReference || "").trim();
    if (!termId || !paymentReference) return NextResponse.json({ error: "termId and paymentReference are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const term = await Term.findOneAndUpdate(
      { schoolId, _id: new mongoose.Types.ObjectId(termId) },
      { $set: { paymentReference } },
      { new: true }
    ).lean();

    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });
    return NextResponse.json({ message: "Payment initiated", termId, paymentReference });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initiate payment" }, { status: 500 });
  }
}
`);

// ─── payments/verify ──────────────────────────────────────────────────────
write("app/api/payments/verify/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const termId = String(body?.termId || "").trim();
    const paymentReference = String(body?.paymentReference || "").trim();
    if (!termId) return NextResponse.json({ error: "termId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const term = await Term.findOneAndUpdate(
      { schoolId, _id: new mongoose.Types.ObjectId(termId) },
      { $set: { isPaid: true, paymentDate: new Date(), ...(paymentReference ? { paymentReference } : {}) } },
      { new: true }
    ).lean();

    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });
    return NextResponse.json({ message: "Payment verified", termId, isPaid: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to verify payment" }, { status: 500 });
  }
}
`);

// ─── audit/marks ──────────────────────────────────────────────────────────
write("app/api/audit/marks/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AuditLog from "@/app/models/AuditLog";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const filter: Record<string, unknown> = { schoolId, action: /^MARK_/i };
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await AuditLog.countDocuments(filter);

    return NextResponse.json({
      logs: logs.map((l) => ({
        _id: l._id.toString(),
        action: l.action,
        userId: l.userId?.toString() || null,
        meta: l.meta || {},
        createdAt: l.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch audit logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = String(body?.action || "").trim().toUpperCase();
    const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};
    if (!action.startsWith("MARK_")) return NextResponse.json({ error: "action must start with MARK_" }, { status: 400 });

    await connectDB();
    const doc = await AuditLog.create({
      schoolId: new mongoose.Types.ObjectId(user.schoolId),
      userId: new mongoose.Types.ObjectId(user.userId),
      action,
      meta,
    });

    return NextResponse.json({ id: doc._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create audit log" }, { status: 500 });
  }
}
`);

console.log("\\n✅ Batch 5 done: attendance (mark, dashboard), remarks/create, payments (initiate, verify), audit/marks");
