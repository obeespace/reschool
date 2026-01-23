import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
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

    if (!subjectId || !classIds || classIds.length === 0) {
      return NextResponse.json({ 
        error: "Subject and classes are required" 
      }, { status: 400 });
    }

    // Verify subject exists
    const subject = await Subject.findOne({ 
      _id: subjectId, 
      schoolId: admin.schoolId 
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Verify all classes exist
    const classes = await Class.find({
      _id: { $in: classIds },
      schoolId: admin.schoolId
    });

    if (classes.length !== classIds.length) {
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

    // Check if subject already assigned
    const existingIndex = teacherProfile.subjectsAndClasses.findIndex(
      (item: any) => item.subjectId.toString() === subjectId
    );

    if (existingIndex >= 0) {
      // Update existing assignment
      teacherProfile.subjectsAndClasses[existingIndex].classIds = classIds;
    } else {
      // Add new assignment
      teacherProfile.subjectsAndClasses.push({
        subjectId,
        classIds
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
