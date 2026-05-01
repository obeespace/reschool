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

    const { termId, paymentReference } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    await connectDB();
    const now = new Date();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const updated = await Term.findOneAndUpdate(
      { _id: termId, schoolId },
      { isPaid: true, paymentDate: now, paymentReference: paymentReference || null },
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
      message: "Term marked as paid successfully",
      term: {
        termId: (updated._id as mongoose.Types.ObjectId).toString(),
        termNumber: updated.termNumber,
        isPaid: updated.isPaid,
        paymentDate: updated.paymentDate,
      },
    });
  } catch (error: unknown) {
    console.error("Mark term paid error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark term as paid" },
      { status: 500 }
    );
  }
}
