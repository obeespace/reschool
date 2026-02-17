import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

// Admin: Get all pending certificates for approval
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const certificates = await Certificate.find({
      schoolId: admin.schoolId,
      signatureApprovalStatus: status
    }).sort({ createdAt: -1 });

    return NextResponse.json({ certificates });
  } catch (error: any) {
    console.error("Fetch certificates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

// Admin: Approve a certificate (before signature)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { certificateId, action } = await req.json();

    if (!certificateId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const certificate = await Certificate.findOne({
      _id: certificateId,
      schoolId: admin.schoolId
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    if (action === "APPROVE") {
      certificate.signatureApprovalStatus = "APPROVED";
    } else {
      certificate.signatureApprovalStatus = "PENDING";
    }

    await certificate.save();

    return NextResponse.json({
      message: `Certificate ${action === "APPROVE" ? "approved" : "rejected"} successfully`,
      certificateNumber: certificate.certificateNumber
    });
  } catch (error: any) {
    console.error("Certificate approval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process certificate" },
      { status: 500 }
    );
  }
}
