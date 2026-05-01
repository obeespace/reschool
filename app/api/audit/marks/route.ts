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

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const filter: Record<string, unknown> = { schoolId, action: /^MARK_/i };
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await AuditLog.countDocuments(filter);

    return NextResponse.json({
      logs: logs.map((l) => ({
        _id: l._id.toString(),
        action: l.action,
        userId: l.userId?.toString() || null,
        meta: l.meta || {},
        createdAt: l.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch audit logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = String(body?.action || "").trim().toUpperCase();
    const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};
    if (!action.startsWith("MARK_")) return NextResponse.json({ error: "action must start with MARK_" }, { status: 400 });

    await connectDB();
    const doc = await AuditLog.create({
      schoolId: new mongoose.Types.ObjectId(user.schoolId),
      userId: new mongoose.Types.ObjectId(user.userId),
      action,
      meta,
    });

    return NextResponse.json({ id: doc._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create audit log" }, { status: 500 });
  }
}
