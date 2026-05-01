import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import { verifyToken } from "@/app/utils/auth";
import { createHash } from "crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";

// Admin: Sign a certificate and make it verifiable
export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { certificateId, principalName, principalSignature } = await req.json();

    if (!certificateId || !principalName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const certificate = await Certificate.findOne({
      _id: certificateId,
      schoolId: admin.schoolId
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    if (certificate.signatureApprovalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Certificate must be approved before signing" },
        { status: 400 }
      );
    }

    // Generate QR code data (certificate verification link)
    const qrData = `${process.env.NEXT_PUBLIC_BASE_URL || "https://reschool.app"}/verify-certificate/${certificate.certificateNumber}`;
    const qrCode = await QRCode.toDataURL(qrData);

    // Generate digital hash for authenticity
    const hashData = `${certificate.certificateNumber}${certificate.studentName}${new Date().getTime()}`;
    const digitalHash = createHash("sha256").update(hashData).digest("hex");

    // Update certificate with signature
    certificate.signedBy = {
      principalId: admin.userId,
      principalName,
      signatureDate: new Date()
    };
    certificate.signatureApprovalStatus = "SIGNED";
    certificate.issuedDate = new Date();
    certificate.qrCode = qrCode;
    certificate.digitalHash = digitalHash;
    certificate.isVerifiable = true;

    await certificate.save();

    return NextResponse.json({
      message: "Certificate signed and issued successfully",
      certificateNumber: certificate.certificateNumber,
      issuedDate: certificate.issuedDate,
      qrCode: certificate.qrCode
    });
  } catch (error: any) {
    console.error("Certificate signing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sign certificate" },
      { status: 500 }
    );
  }
}
