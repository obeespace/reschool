import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const termId = String(body?.termId || "").trim();
    const paymentReference = String(body?.paymentReference || "").trim();
    if (!termId || !paymentReference) return NextResponse.json({ error: "termId and paymentReference are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const term = await Term.findOneAndUpdate(
      { schoolId, _id: new mongoose.Types.ObjectId(termId) },
      { $set: { paymentReference } },
      { new: true }
    ).lean();

    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });
    return NextResponse.json({ message: "Payment initiated", termId, paymentReference });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initiate payment" }, { status: 500 });
  }
}
