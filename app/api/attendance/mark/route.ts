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
