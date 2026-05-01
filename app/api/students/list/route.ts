import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import "@/app/models/Class";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const students = await Student.find({ schoolId: user!.schoolId })
      .populate("currentClassId", "level arm")
      .populate("parentId", "fullName email")
      .sort({ admissionNumber: 1 });

    return NextResponse.json({
      students: students.map(student => ({
        id: student._id.toString(),
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        currentClass: student.currentClassId ? {
          level: (student.currentClassId as any).level,
          arm: (student.currentClassId as any).arm
        } : null,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        parent: student.parentId ? {
          id: (student.parentId as any)._id?.toString?.() || null,
          fullName: (student.parentId as any).fullName,
          email: (student.parentId as any).email
        } : null,
        isPrefect: student.isPrefect,
        prefectTitle: student.prefectTitle || null,
        isSuspended: student.isSuspended,
        suspendedAt: student.suspendedAt || null,
        suspendedReason: student.suspendedReason || null
      }))
    });
  } catch (error: any) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}
