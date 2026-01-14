import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { fullName, parentId, classId } = await req.json();

  const student = await Student.create({
    schoolId: admin.schoolId,
    fullName,
    parentId,
    currentClassId: classId
  });

  return NextResponse.json({ studentId: student._id });
}
