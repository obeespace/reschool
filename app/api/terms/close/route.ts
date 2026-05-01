import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import mongoose from "mongoose";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { termId } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const updated = await Term.findOneAndUpdate(
      { _id: termId, schoolId },
      { isClosed: true, isActive: false },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`reports:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:class-ranking:${admin.schoolId}:`);

    return NextResponse.json({
      message: "Term closed successfully. No further edits allowed.",
      termId: (updated._id as mongoose.Types.ObjectId).toString(),
    });
  } catch (error: unknown) {
    console.error("Close term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close term" },
      { status: 500 }
    );
  }
}
