import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Score from "@/app/models/Score";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: any = verifyToken(token || "");

    if (!parent || parent.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const students = await Student.find({
      schoolId: parent.schoolId,
      parentId: parent.userId
    }).populate("currentClassId", "level arm");

    const studentIds = students.map((s) => s._id);

    const scores = await Score.find({
      schoolId: parent.schoolId,
      studentId: { $in: studentIds }
    })
      .populate("subjectId", "name code")
      .populate("classId", "level arm")
      .sort({ term: 1, createdAt: -1 });

    return NextResponse.json({ students, scores });
  } catch (error: any) {
    console.error("Fetch ward scores error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ward scores" },
      { status: 500 }
    );
  }
}
