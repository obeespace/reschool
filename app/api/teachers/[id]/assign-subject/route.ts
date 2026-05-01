import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const { subjectId, classIds } = await req.json();
    const normalizedSubjectId = typeof subjectId === "string" ? subjectId.trim() : "";
    const normalizedClassIds = Array.isArray(classIds)
      ? [...new Set(classIds.filter((classId: any) => typeof classId === "string" && classId.trim()))]
      : [];

    if (!normalizedSubjectId || normalizedClassIds.length === 0) {
      return NextResponse.json({ 
        error: "Subject and classes are required" 
      }, { status: 400 });
    }

    // Verify subject exists
    const subject = await Subject.findOne({ 
      _id: normalizedSubjectId, 
      schoolId: admin.schoolId 
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const teacherExists = await User.findOne({
      _id: teacherId,
      schoolId: admin.schoolId,
      role: "TEACHER"
    });

    if (!teacherExists) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Verify all classes exist
    const classes = await Class.find({
      _id: { $in: normalizedClassIds },
      schoolId: admin.schoolId
    });

    if (classes.length !== normalizedClassIds.length) {
      return NextResponse.json({ error: "Some classes not found" }, { status: 404 });
    }

    // Get or create teacher profile
    let teacherProfile = await TeacherProfile.findOne({
      userId: teacherId,
      schoolId: admin.schoolId
    });

    if (!teacherProfile) {
      teacherProfile = await TeacherProfile.create({
        userId: teacherId,
        schoolId: admin.schoolId,
        subjectsAndClasses: []
      });
    }

    if (!Array.isArray(teacherProfile.subjectsAndClasses)) {
      teacherProfile.subjectsAndClasses = [];
    }

    // Check if subject already assigned
    const existingIndex = teacherProfile.subjectsAndClasses.findIndex(
      (item: any) => item?.subjectId?.toString() === normalizedSubjectId
    );

    if (existingIndex >= 0) {
      // Update existing assignment
      teacherProfile.subjectsAndClasses[existingIndex].classIds = normalizedClassIds;
    } else {
      // Add new assignment
      teacherProfile.subjectsAndClasses.push({
        subjectId: normalizedSubjectId,
        classIds: normalizedClassIds
      });
    }

    await teacherProfile.save();

    return NextResponse.json({ 
      success: true,
      message: "Subject assigned successfully" 
    });
  } catch (error: any) {
    console.error("Assign subject error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign subject" },
      { status: 500 }
    );
  }
}
