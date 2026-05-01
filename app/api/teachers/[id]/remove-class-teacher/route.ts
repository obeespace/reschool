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
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);

    await TeacherProfile.updateOne({ schoolId, userId }, { $unset: { classTeacherOf: "" } });
    return NextResponse.json({ message: "Class teacher role removed" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to remove class teacher" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
