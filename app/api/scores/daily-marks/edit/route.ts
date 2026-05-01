import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import DailyMark from "@/app/models/DailyMark";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const id = String(body?.id || body?.markId || "").trim();
    const score = Number(body?.score);
    const notes = body?.notes !== undefined ? String(body.notes).trim() : undefined;

    if (!id || !Number.isFinite(score)) return NextResponse.json({ error: "id and score are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm?.isPaid) return NextResponse.json({ error: "Term subscription not paid" }, { status: 400 });
    if (activeTerm?.isClosed) return NextResponse.json({ error: "Term is closed" }, { status: 400 });

    const mark = await DailyMark.findOne({ _id: new mongoose.Types.ObjectId(id), schoolId });
    if (!mark) return NextResponse.json({ error: "Daily mark not found" }, { status: 404 });

    if (!Array.isArray(mark.modificationHistory)) mark.modificationHistory = [];
    mark.modificationHistory.push({ previousScore: mark.score, editedBy: new mongoose.Types.ObjectId(teacher.userId), editedAt: new Date() });
    mark.score = score;
    if (notes !== undefined) mark.notes = notes;
    await mark.save();

    return NextResponse.json({ message: "Daily mark updated", id });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to edit daily mark" }, { status: 500 });
  }
}

export async function PUT(req: Request) { return PATCH(req); }
