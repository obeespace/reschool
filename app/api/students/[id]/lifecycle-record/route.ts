import connectDB from "@/app/utils/db";
import StudentLifecycleRecord from "@/app/models/StudentLifecycleRecord";
import ReportCard from "@/app/models/ReportCard";
import Certificate from "@/app/models/Certificate";
import Student from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(
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

    // Fetch student lifecycle record
    const lifecycleRecord = await StudentLifecycleRecord.findOne({
      schoolId: user.schoolId,
      studentId: id
    }).populate("studentId", "fullName admissionNumber");

    if (!lifecycleRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Verify access: admins see all, parents see only their wards, teachers see their class students
    if (user.role === "PARENT") {
      const student = await Student.findById(id);
      if (student?.parentId?.toString() !== user.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return NextResponse.json({ lifecycleRecord });
  } catch (error: any) {
    console.error("Fetch lifecycle record error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch lifecycle record" },
      { status: 500 }
    );
  }
}
