import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const termId = String(body?.termId || "").trim();
    const reportIds: string[] = Array.isArray(body?.reportIds) ? body.reportIds.map(String) : [];
    if (!termId) return NextResponse.json({ error: "termId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const approvedBy = new mongoose.Types.ObjectId(admin.userId);
    const now = new Date();

    let result;
    if (reportIds.length > 0) {
      result = await ReportCard.updateMany(
        { schoolId, _id: { $in: reportIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $set: { approvedBy, approvedAt: now } }
      );
    } else {
      result = await ReportCard.updateMany(
        { schoolId, termId: new mongoose.Types.ObjectId(termId) },
        { $set: { approvedBy, approvedAt: now } }
      );
    }

    return NextResponse.json({ message: "Reports released", count: result.modifiedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to release reports" }, { status: 500 });
  }
}

export async function PATCH(req: Request) { return POST(req); }
