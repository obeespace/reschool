import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    await Student.findOneAndDelete({ _id: id, schoolId });

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete student" },
      { status: 500 }
    );
  }
}
