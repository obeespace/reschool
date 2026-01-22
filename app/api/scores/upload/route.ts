import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import TeacherProfile from "@/app/models/TeacherProfile";
import TeacherActivity from "@/app/models/TeacherActivity";
import AcademicYear from "@/app/models/AcademicYear";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: any = verifyToken(token || "");

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      studentId,
      classId,
      subjectId,
      term,
      classwork,
      homework,
      extracurricular,
      test,
      exam
    } = await req.json();

    // Verify teacher is assigned to teach this subject in this class
    const teacherProfile = await TeacherProfile.findOne({ userId: teacher.userId });

    if (!teacherProfile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Check if teacher teaches this subject in this class
    const teachesSubjectInClass = teacherProfile.subjectsAndClasses.some(
      (sc: any) => 
        sc.subjectId.toString() === subjectId &&
        sc.classIds.some((cId: any) => cId.toString() === classId)
    );

    if (!teachesSubjectInClass) {
      return NextResponse.json(
        { error: "You are not authorized to edit scores for this subject in this class" },
        { status: 403 }
      );
    }

    // Get active academic year
    const activeYear = await AcademicYear.findOne({
      schoolId: teacher.schoolId,
      isActive: true
    });

    if (!activeYear) {
      return NextResponse.json(
        { error: "No active academic year found" },
        { status: 400 }
      );
    }

    // Create or update score
    const score = await Score.findOneAndUpdate(
      {
        studentId,
        classId,
        subjectId,
        term,
        academicYearId: activeYear._id
      },
      {
        schoolId: teacher.schoolId,
        studentId,
        classId,
        subjectId,
        term,
        classwork: classwork || 0,
        homework: homework || 0,
        extracurricular: extracurricular || 0,
        test: test || 0,
        exam: exam || 0,
        teacherId: teacher.userId,
        academicYearId: activeYear._id
      },
      { upsert: true, new: true }
    );

    await TeacherActivity.create({
      schoolId: teacher.schoolId,
      teacherId: teacher.userId,
      action: "UPLOAD_SCORE"
    });

    return NextResponse.json({ 
      scoreId: score._id,
      message: "Score uploaded successfully"
    });
  } catch (error: any) {
    console.error("Score upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload score" },
      { status: 500 }
    );
  }
}
