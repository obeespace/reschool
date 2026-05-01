import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AuditLog from "@/app/models/AuditLog";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const logs = await AuditLog.find({ schoolId }).sort({ createdAt: -1 }).limit(1000).lean();
    return NextResponse.json({ data: logs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
