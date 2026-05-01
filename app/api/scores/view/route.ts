import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import "@/app/models/Students";
import "@/app/models/Class";
import "@/app/models/Subject";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

// Get scores for a student, class, or subject
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const term = searchParams.get("term");

    const query: any = { schoolId: user.schoolId };

    if (studentId) query.studentId = studentId;
    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (term) query.term = parseInt(term);

    const scores = await Score.find(query)
      .populate("studentId", "fullName")
      .populate("classId", "level arm")
      .populate("subjectId", "name code")
      .populate("teacherId", "fullName")
      .sort({ createdAt: -1 });

    return NextResponse.json({ scores });
  } catch (error: any) {
    console.error("Fetch scores error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch scores" },
      { status: 500 }
    );
  }
}
