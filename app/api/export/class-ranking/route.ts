import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ data: [] });
    const filter: Record<string, unknown> = { schoolId, termId: activeTerm._id };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    const reports = await ReportCard.find(filter).sort({ average: -1 }).lean();
    const studentIds = reports.map((r) => r.studentId);
    const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).lean() : [];
    const studentMap = new Map(students.map((s) => [s._id.toString(), (s as {fullName: string}).fullName]));
    return NextResponse.json({
      data: reports.map((r, i) => ({ position: r.position ?? (i + 1), studentId: r.studentId.toString(), studentName: studentMap.get(r.studentId.toString()) || "Unknown", average: r.average, classId: r.classId.toString() }))
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
