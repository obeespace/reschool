import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const subjectId = String(body?.subjectId || "").trim();
    const classIds: string[] = Array.isArray(body?.classIds) ? body.classIds.map(String) : [];
    if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);
    const subjectOId = new mongoose.Types.ObjectId(subjectId);
    const classOIds = classIds.map((cid) => new mongoose.Types.ObjectId(cid));

    const profile = await TeacherProfile.findOne({ schoolId, userId });
    if (!profile) {
      await TeacherProfile.create({ schoolId, userId, subjectsAndClasses: [{ subjectId: subjectOId, classIds: classOIds }] });
    } else {
      const idx = profile.subjectsAndClasses.findIndex((e: {subjectId: mongoose.Types.ObjectId}) => e.subjectId.toString() === subjectId);
      if (idx >= 0) profile.subjectsAndClasses[idx].classIds = classOIds;
      else profile.subjectsAndClasses.push({ subjectId: subjectOId, classIds: classOIds });
      await profile.save();
    }

    return NextResponse.json({ message: "Subject assigned" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign subject" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
