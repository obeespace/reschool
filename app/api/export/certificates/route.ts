import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import Students from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Bulk Certificate Export API
 * Download all certificates for a class/term as JSON or CSV
 * Access: ADMIN only (for security - certificates are sensitive)
 */

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const format = searchParams.get("format") || "json"; // json | csv

    const query: any = { schoolId: user.schoolId, signatureApprovalStatus: "SIGNED" };

    if (academicYearId) query.academicYearId = academicYearId;

    // Fetch certificates
    let certificates = await Certificate.find(query)
      .populate("studentId", "fullName studentId currentClass")
      .sort({ certificateNumber: 1 })
      .lean();

    // Filter by class if provided
    if (classId) {
      const studentIds = await Students.find({
        currentClass: classId,
        schoolId: user.schoolId
      }).select("_id");

      certificates = certificates.filter((c: any) =>
        studentIds.some((s) => s._id.toString() === c.studentId._id.toString())
      );
    }

    if (certificates.length === 0) {
      return NextResponse.json({ error: "No certificates found" }, { status: 404 });
    }

    if (format === "csv") {
      // CSV export
      let csv = "Certificate Number,Student Name,Student ID,Issue Date,Verification Code\n";

      certificates.forEach((cert: any) => {
        csv += `${cert.certificateNumber},"${cert.studentId.fullName}",${cert.studentId.studentId},${new Date(
          cert.signedAt
        ).toLocaleDateString()},${cert.digitalHash.substring(0, 10)}...\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="certificates_${new Date().getTime()}.csv"`
        }
      });
    }

    // JSON export
    return NextResponse.json({
      exportDate: new Date(),
      totalCertificates: certificates.length,
      format: "json",
      certificates: certificates.map((c: any) => ({
        certificateNumber: c.certificateNumber,
        studentName: c.studentId.fullName,
        studentId: c.studentId.studentId,
        issuedDate: c.signedAt,
        signedBy: c.signedBy,
        verificationCode: c.digitalHash.substring(0, 20),
        qrCode: c.qrCode,
        isVerifiable: c.isVerifiable
      }))
    });
  } catch (error: any) {
    console.error("Export certificates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export certificates" },
      { status: 500 }
    );
  }
}
