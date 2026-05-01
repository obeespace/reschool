import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const cert = await Certificate.findOne({ schoolId, studentId: new mongoose.Types.ObjectId(id) }).lean();
    return NextResponse.json({
      hasCertificate: Boolean(cert),
      certificate: cert ? {
        _id: (cert as {_id: mongoose.Types.ObjectId})._id.toString(),
        signatureApprovalStatus: (cert as {signatureApprovalStatus?: string}).signatureApprovalStatus,
        isVerifiable: (cert as {isVerifiable?: boolean}).isVerifiable,
        createdAt: (cert as {createdAt?: Date}).createdAt,
      } : null,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch certificate status" }, { status: 500 });
  }
}
