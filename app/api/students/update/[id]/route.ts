import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import TeacherProfile from "@/app/models/TeacherProfile";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
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
      isPrefect,
      prefectTitle,
      isSuspended,
      suspendedReason
    } = await req.json();

    if (!fullName || !admissionNumber) {
      return NextResponse.json(
        { error: "Full name and admission number are required" },
        { status: 400 }
      );
    }

    const student = await Student.findOne({
      _id: id,
      schoolId: user.schoolId
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Check permissions for teachers
    if (user.role === "TEACHER") {
      const teacherProfile = await TeacherProfile.findOne({ userId: user.userId });
      
      if (!teacherProfile) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      // Check if teacher is the class teacher of this student's class
      if (!teacherProfile.classTeacherOf || 
          teacherProfile.classTeacherOf.toString() !== student.currentClassId?.toString()) {
        return NextResponse.json(
          { error: "You can only edit students in your class" },
          { status: 403 }
        );
      }
    }

    const updatePayload: any = {
      fullName,
      admissionNumber,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null
    };

    if (user.role === "ADMIN") {
      if (parentId !== undefined) updatePayload.parentId = parentId || null;
      if (isPrefect !== undefined) updatePayload.isPrefect = !!isPrefect;
      if (prefectTitle !== undefined) updatePayload.prefectTitle = prefectTitle || null;
      if (isSuspended !== undefined) {
        updatePayload.isSuspended = !!isSuspended;
        updatePayload.suspendedAt = isSuspended ? new Date() : null;
        updatePayload.suspendedReason = isSuspended ? (suspendedReason || null) : null;
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, updatePayload, { new: true });

    return NextResponse.json({
      message: "Student updated successfully",
      student: updatedStudent
    });

  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}
