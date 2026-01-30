import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { studentId, parentId } = await req.json();

    if (!studentId || !parentId) {
      return NextResponse.json(
        { error: "Student ID and Parent ID are required" },
        { status: 400 }
      );
    }

    // Verify student exists and belongs to the school
    const student = await Student.findOne({ 
      _id: studentId, 
      schoolId: user.schoolId 
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Verify parent exists and belongs to the school
    const parent = await User.findOne({ 
      _id: parentId, 
      schoolId: user.schoolId,
      role: "PARENT"
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent not found" },
        { status: 404 }
      );
    }

    // Link student to parent
    await Student.findByIdAndUpdate(studentId, {
      parentId: parentId
    });

    return NextResponse.json({ 
      message: "Student linked to parent successfully"
    });

  } catch (error) {
    console.error("Error linking student to parent:", error);
    return NextResponse.json(
      { error: "Failed to link student to parent" },
      { status: 500 }
    );
  }
}
