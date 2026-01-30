import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import Student from "@/app/models/Students";
import TeacherProfile from "@/app/models/TeacherProfile";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: classId } = await params;

    // Get class details
    const classDoc = await Class.findOne({ 
      _id: classId, 
      schoolId: user.schoolId 
    })
      .populate("classTeacherId", "fullName email")
      .populate("subjectIds", "name code");

    if (!classDoc) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Get students in this class
    const students = await Student.find({ 
      schoolId: user.schoolId,
      currentClassId: classId 
    })
      .populate("parentId", "fullName email")
      .sort({ fullName: 1 });

    // Get teachers teaching subjects in this class
    const teachersTeachingHere = await TeacherProfile.find({
      schoolId: user.schoolId,
      "subjectsAndClasses.classIds": classId
    })
      .populate("userId", "fullName email")
      .populate("subjectsAndClasses.subjectId", "name code");

    // Build subject-teacher mapping
    const subjectTeachers = teachersTeachingHere.reduce((acc: any[], teacherProfile: any) => {
      teacherProfile.subjectsAndClasses.forEach((assignment: any) => {
        if (assignment.classIds.some((id: any) => id.toString() === classId)) {
          acc.push({
            subject: {
              _id: assignment.subjectId._id,
              name: assignment.subjectId.name,
              code: assignment.subjectId.code
            },
            teacher: {
              _id: teacherProfile.userId._id,
              fullName: teacherProfile.userId.fullName,
              email: teacherProfile.userId.email
            }
          });
        }
      });
      return acc;
    }, []);

    // Calculate statistics
    const stats = {
      totalStudents: students.length,
      maleStudents: students.filter((s: any) => s.gender === "MALE").length,
      femaleStudents: students.filter((s: any) => s.gender === "FEMALE").length,
      totalSubjects: classDoc.subjectIds?.length || 0,
      hasClassTeacher: !!classDoc.classTeacherId
    };

    const classDetails = {
      _id: classDoc._id,
      name: classDoc.name || `${classDoc.level} ${classDoc.arm}`,
      level: classDoc.level,
      arm: classDoc.arm,
      classTeacher: classDoc.classTeacherId ? {
        _id: classDoc.classTeacherId._id,
        fullName: classDoc.classTeacherId.fullName,
        email: classDoc.classTeacherId.email
      } : null,
      subjects: classDoc.subjectIds || [],
      students: students.map((s: any) => ({
        _id: s._id,
        fullName: s.fullName,
        registrationNumber: s.registrationNumber,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        parent: s.parentId ? {
          fullName: s.parentId.fullName,
          email: s.parentId.email
        } : null
      })),
      subjectTeachers,
      stats
    };

    return NextResponse.json({ success: true, class: classDetails });
  } catch (error: any) {
    console.error("Get class details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch class details" },
      { status: 500 }
    );
  }
}
