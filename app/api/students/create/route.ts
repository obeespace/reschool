import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      fullName,
      admissionNumber,
      dateOfBirth,
      gender,
      parentId,
      parentFullName,
      parentEmail,
      parentPassword,
      classId
    } = await req.json();

    if (!fullName || !classId || !admissionNumber) {
      return NextResponse.json(
        { error: "Full name, admission number, and class ID are required" },
        { status: 400 }
      );
    }

    // Check permissions
    if (user.role === "ADMIN") {
      // Admin can create students for any class
    } else if (user.role === "TEACHER") {
      // Only class teachers can create students for their assigned class
      const teacherProfile = await TeacherProfile.findOne({ userId: user.userId });
      
      if (!teacherProfile) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      // Check if teacher is the class teacher of this class
      if (!teacherProfile.classTeacherOf || 
          teacherProfile.classTeacherOf.toString() !== classId) {
        return NextResponse.json(
          { error: "Only class teachers can create students for their assigned class" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify class exists and belongs to the school
    const classDoc = await Class.findOne({ 
      _id: classId, 
      schoolId: user.schoolId 
    });

    if (!classDoc) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    const existingStudent = await Student.findOne({
      schoolId: user.schoolId,
      admissionNumber
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "Admission number already exists" },
        { status: 400 }
      );
    }

    let linkedParentId = parentId || null;
    let temporaryParentPassword: string | null = null;

    if (!linkedParentId && parentEmail && parentFullName) {
      const existingParent = await User.findOne({ email: parentEmail });

      if (existingParent) {
        if (existingParent.role !== "PARENT") {
          return NextResponse.json(
            { error: "Email already belongs to a non-parent account" },
            { status: 400 }
          );
        }

        if (existingParent.schoolId?.toString() !== user.schoolId) {
          return NextResponse.json(
            { error: "Parent account belongs to a different school" },
            { status: 400 }
          );
        }

        linkedParentId = existingParent._id;
      } else {
        const rawPassword = parentPassword || Math.random().toString(36).slice(2, 10);
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const newParent = await User.create({
          fullName: parentFullName,
          email: parentEmail,
          passwordHash,
          role: "PARENT",
          schoolId: user.schoolId
        });

        linkedParentId = newParent._id;
        temporaryParentPassword = parentPassword ? null : rawPassword;
      }
    }

    const student = await Student.create({
      schoolId: user.schoolId,
      fullName,
      admissionNumber,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      parentId: linkedParentId,
      currentClassId: classId
    });

    // Add student to class
    await Class.findByIdAndUpdate(classId, {
      $push: { studentIds: student._id }
    });

    return NextResponse.json({ 
      studentId: student._id.toString(),
      parentId: linkedParentId,
      temporaryParentPassword,
      message: "Student created successfully"
    });
  } catch (error: any) {
    console.error("Student creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create student" },
      { status: 500 }
    );
  }
}
