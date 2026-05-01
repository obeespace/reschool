import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import TeacherProfile from "@/app/models/TeacherProfile";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const studentId = typeof body.studentId === "string" ? body.studentId : "";
    const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
    const classId = typeof body.classId === "string" ? body.classId : "";
    const academicYearId = typeof body.academicYearId === "string" ? body.academicYearId : "";
    const requestedTermId = typeof body.termId === "string" ? body.termId : undefined;

    const rawAssessmentType = typeof body.assessmentType === "string"
      ? body.assessmentType
      : typeof body.type === "string"
        ? body.type
        : "";

    const assessmentTypeMap: Record<string, string> = {
      CLASSWORK: "CLASSWORK",
      classwork: "CLASSWORK",
      HOMEWORK: "HOMEWORK",
      homework: "HOMEWORK",
      EVALUATION: "EVALUATION",
      evaluation: "EVALUATION",
      TEST: "EVALUATION",
      test: "EVALUATION",
      EXTRACURRICULAR: "EVALUATION",
      extracurricular: "EVALUATION",
      EXAM: "EXAM",
      exam: "EXAM"
    };

    const assessmentType = assessmentTypeMap[rawAssessmentType] || "";
    const score = Number(body.score);
    const maxScore = body.maxScore !== undefined ? Number(body.maxScore) : 10;
    const feedbackNotes = typeof body.feedbackNotes === "string"
      ? body.feedbackNotes
      : typeof body.notes === "string"
        ? body.notes
        : "";

    if (!studentId || !subjectId || !classId || !assessmentType || Number.isNaN(score) || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (score < 0 || score > 100) {
      return NextResponse.json({ error: "Score must be between 0 and 100" }, { status: 400 });
    }

    if (Number.isNaN(maxScore) || maxScore <= 0) {
      return NextResponse.json({ error: "Max score must be greater than 0" }, { status: 400 });
    }

    const activeTerm = requestedTermId
      ? await Term.findOne({ _id: requestedTermId, schoolId: user.schoolId })
      : await Term.findOne({ schoolId: user.schoolId, isActive: true });

    if (!activeTerm) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (activeTerm.isClosed) {
      return NextResponse.json({ error: "This term is closed. Cannot record marks." }, { status: 400 });
    }

    const teacherProfile = await TeacherProfile.findOne({
      schoolId: user.schoolId,
      userId: user.userId
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const teachesSubjectInClass = (teacherProfile.subjectsAndClasses || []).some(
      (assignment: any) =>
        assignment?.subjectId?.toString() === subjectId &&
        (assignment?.classIds || []).some((classObjectId: any) => classObjectId?.toString() === classId)
    );

    if (!teachesSubjectInClass) {
      return NextResponse.json(
        { error: "You can only upload marks for subjects/classes assigned to you" },
        { status: 403 }
      );
    }

    const student = await Student.findOne({
      _id: studentId,
      schoolId: user.schoolId,
      currentClassId: classId
    }).select("_id");

    if (!student) {
      return NextResponse.json({ error: "Student not found in selected class" }, { status: 404 });
    }

    const dailyMark = await DailyMark.create({
      schoolId: user.schoolId,
      studentId,
      subjectId,
      classId,
      teacherId: user.userId,
      assessmentType,
      score,
      maxScore,
      feedbackNotes,
      recordedDate: new Date(),
      recordedBy: user.userId,
      academicYearId,
      termId: activeTerm._id,
      modificationHistory: []
    });

    return NextResponse.json({
      message: "Daily mark recorded successfully",
      dailyMark: {
        id: dailyMark._id.toString(),
        studentId,
        score,
        assessmentType
      }
    });
  } catch (error: any) {
    console.error("Error recording daily mark:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record daily mark" },
      { status: 500 }
    );
  }
}
