import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import TeacherProfile from "@/app/models/TeacherProfile";
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
      return NextResponse.json({ error: `assessmentType must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const profile = await TeacherProfile.findOne({
      schoolId,
      userId: new mongoose.Types.ObjectId(teacher.userId),
    }).lean();
    if (!profile) return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });

    const allowed = (profile.subjectsAndClasses || []).some(
      (s: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) =>
        s.subjectId.toString() === subjectId &&
        (s.classIds || []).some((cid) => cid.toString() === classId)
    );
    if (!allowed) return NextResponse.json({ error: "You are not assigned to this subject/class combination" }, { status: 403 });

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
