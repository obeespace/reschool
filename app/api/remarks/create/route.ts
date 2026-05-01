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
        remark: r.customRemark || "",
        customRemark: r.customRemark || "",
        type: r.type,
        academicPerformance: r.academicPerformance,
        classParticipation: r.classParticipation,
        attitudeToDuties: r.attitudeToDuties,
        promotionRecommendation: r.promotionRecommendation || null,
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
    // Support both simple `remark` and full structured fields
    const customRemark = String(body?.remark || body?.customRemark || "").trim();
    const type = body?.type === "CLASS_TEACHER" ? "CLASS_TEACHER" : "SUBJECT";
    const subjectId = body?.subjectId ? String(body.subjectId).trim() : null;
    const academicPerformance = body?.academicPerformance || "GOOD";
    const classParticipation = body?.classParticipation || "GOOD";
    const attitudeToDuties = body?.attitudeToDuties || "GOOD";
    const promotionRecommendation = body?.promotionRecommendation || "PENDING";

    if (!studentId || !customRemark) return NextResponse.json({ error: "studentId and remark are required" }, { status: 400 });
    if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ error: "No active term found" }, { status: 400 });

    const doc = await TeacherRemark.create({
      schoolId,
      remarkedBy: new mongoose.Types.ObjectId(teacher.userId),
      studentId: new mongoose.Types.ObjectId(studentId),
      classId: new mongoose.Types.ObjectId(classId),
      termId: activeTerm._id,
      academicYearId: activeTerm.academicYearId,
      type,
      ...(subjectId && { subjectId: new mongoose.Types.ObjectId(subjectId) }),
      academicPerformance,
      classParticipation,
      attitudeToDuties,
      customRemark,
      promotionRecommendation,
    });

    return NextResponse.json({ message: "Remark created", id: doc._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create remark" }, { status: 500 });
  }
}
