import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import TeacherProfile from "@/app/models/TeacherProfile";
import "@/app/models/Subject";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

// Get students for a specific class
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    if (user.role === "TEACHER") {
      const teacherProfile = await TeacherProfile.findOne({
        schoolId: user.schoolId,
        userId: user.userId
      }).select("subjectsAndClasses");

      const canAccessClass = (teacherProfile?.subjectsAndClasses || []).some(
        (assignment: any) =>
          (assignment?.classIds || []).some((classObjectId: any) => classObjectId?.toString() === classId)
      );

      if (!canAccessClass) {
        return NextResponse.json(
          { error: "You can only access students in classes assigned to you" },
          { status: 403 }
        );
      }
    }

    // Verify class exists and belongs to the school
    const classDoc = await Class.findOne({
      _id: classId,
      schoolId: user.schoolId
    }).populate("subjectIds", "name code");

    if (!classDoc) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Get all students in the class
    const students = await Student.find({
      schoolId: user.schoolId,
      currentClassId: classId
    })
      .populate("parentId", "fullName email")
      .sort({ fullName: 1 });

    return NextResponse.json({
      class: {
        _id: classDoc._id,
        level: classDoc.level,
        arm: classDoc.arm,
        subjects: classDoc.subjectIds
      },
      students,
      count: students.length
    });
  } catch (error: any) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}
