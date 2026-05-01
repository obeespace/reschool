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
