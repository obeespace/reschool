import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const id = String(body?.id || body?.certificateId || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const cert = await Certificate.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), schoolId },
      { $set: { signatureApprovalStatus: "SIGNED", signedBy: new mongoose.Types.ObjectId(admin.userId), signedAt: new Date(), isVerifiable: true } },
      { new: true }
    ).lean();

    if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    return NextResponse.json({ message: "Certificate signed", certificateId: id });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to sign certificate" }, { status: 500 });
  }
}
