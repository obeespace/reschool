import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import TeacherProfile from "@/app/models/TeacherProfile";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function DELETE(
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

    // Check permissions
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
          { error: "You can only delete students in your class" },
          { status: 403 }
        );
      }
    } else if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Remove student from class
    if (student.currentClassId) {
      await Class.findByIdAndUpdate(student.currentClassId, {
        $pull: { studentIds: student._id }
      });
    }

    // Delete the student
    await Student.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Student deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
