import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AuditLog from "@/app/models/AuditLog";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const studentId = searchParams.get("studentId");

    const filter: Record<string, unknown> = {
      schoolId,
      action: { $in: ["AI_JSS3_RECOMMENDATION_GENERATED", "AI_SSS3_RECOMMENDATION_GENERATED"] },
    };
    if (studentId) filter["meta.studentId"] = studentId;

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ history: logs.map((l) => ({ _id: l._id.toString(), action: l.action, meta: l.meta, createdAt: l.createdAt })) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch recommendation history" }, { status: 500 });
  }
}
