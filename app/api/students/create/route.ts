import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { fullName, parentId, classId } = await req.json();

    if (!fullName || !classId) {
      return NextResponse.json(
        { error: "Full name and class ID are required" },
        { status: 400 }
      );
    }

    const student = await Student.create({
      schoolId: user.schoolId,
      fullName,
      parentId: parentId || null,
      currentClassId: classId
    });

    return NextResponse.json({ 
      studentId: student._id.toString(),
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
