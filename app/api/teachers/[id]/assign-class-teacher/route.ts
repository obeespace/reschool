import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);
    const classOId = new mongoose.Types.ObjectId(classId);

    const cls = await Class.findOne({ schoolId, _id: classOId }).lean();
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    // Clear old class teacher
    await TeacherProfile.updateMany({ schoolId, classTeacherOf: classOId }, { $unset: { classTeacherOf: "" } });

    await TeacherProfile.findOneAndUpdate(
      { schoolId, userId },
      { $set: { classTeacherOf: classOId } },
      { upsert: true }
    );

    return NextResponse.json({ message: "Class teacher assigned" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign class teacher" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
