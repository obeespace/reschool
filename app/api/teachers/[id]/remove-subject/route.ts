import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
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
    const { subjectId } = await req.json();

    // Remove subject from teacher profile
    await TeacherProfile.findOneAndUpdate(
      { userId: teacherId, schoolId: admin.schoolId },
      { 
        $pull: { 
          subjectsAndClasses: { subjectId } 
        } 
      }
    );

    return NextResponse.json({ 
      success: true,
      message: "Subject removed successfully" 
    });
  } catch (error: any) {
    console.error("Remove subject error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove subject" },
      { status: 500 }
    );
  }
}
