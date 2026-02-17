import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import Student from "@/app/models/Students";
import StudentLifecycleRecord from "@/app/models/StudentLifecycleRecord";
import { verifyToken } from "@/app/utils/auth";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";

// Get certificate status for a student
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify access
    const student = await Student.findOne({
      _id: id,
      schoolId: user.schoolId
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (user.role === "PARENT" && student.parentId?.toString() !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get lifecycle record to check graduation status
    const lifecycle = await StudentLifecycleRecord.findOne({
      schoolId: user.schoolId,
      studentId: id
    });

    if (!lifecycle || lifecycle.currentStatus !== "GRADUATED") {
      return NextResponse.json({
        certificateStatus: "NOT_ELIGIBLE",
        message: "Student has not graduated yet"
      });
    }

    // Get certificate if exists
    const certificate = await Certificate.findOne({
      schoolId: user.schoolId,
      studentId: id
    });

    return NextResponse.json({
      certificateStatus: certificate?.certificationStatus || "PENDING",
      lifecycle: {
        currentStatus: lifecycle.currentStatus,
        graduationDate: lifecycle.graduationDate
      },
      certificate: certificate
        ? {
            certificateNumber: certificate.certificateNumber,
            issuedDate: certificate.issuedDate,
            signatureApprovalStatus: certificate.signatureApprovalStatus
          }
        : null
    });
  } catch (error: any) {
    console.error("Fetch certificate status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch certificate status" },
      { status: 500 }
    );
  }
}

// Admin: Generate a certificate for a student
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: any = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const student = await Student.findOne({
      _id: id,
      schoolId: admin.schoolId
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if student is graduated
    const lifecycle = await StudentLifecycleRecord.findOne({
      schoolId: admin.schoolId,
      studentId: id
    });

    if (!lifecycle || lifecycle.currentStatus !== "GRADUATED") {
      return NextResponse.json(
        { error: "Student is not eligible for certification" },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const existingCert = await Certificate.findOne({
      schoolId: admin.schoolId,
      studentId: id
    });

    if (existingCert) {
      return NextResponse.json(
        { error: "Certificate already exists for this student" },
        { status: 400 }
      );
    }

    // Generate unique certificate number
    const year = new Date().getFullYear();
    const sequenceNumber = String(
      (await Certificate.countDocuments({
        schoolId: admin.schoolId,
        graduationYear: lifecycle.graduationDate?.getFullYear() || year
      })) + 1
    ).padStart(4, "0");

    const certificateNumber = `CERT-${lifecycle.graduationDate?.getFullYear() || year}-${sequenceNumber}`;

    // Create certificate
    const certificate = await Certificate.create({
      schoolId: admin.schoolId,
      studentId: id,
      studentName: student.fullName,
      studentAdmissionNumber: student.admissionNumber,
      admissionYear: student.createdAt?.getFullYear() || year,
      graduationYear: lifecycle.graduationDate?.getFullYear() || year,
      classLevel: lifecycle.currentClass,
      certificateNumber,
      certificationStatus: "PENDING",
      reprintCount: 0,
      isVerifiable: false
    });

    // Update lifecycle record
    await StudentLifecycleRecord.updateOne(
      { _id: lifecycle._id },
      {
        ceremonyId: certificate._id,
        certificationStatus: "PENDING"
      }
    );

    return NextResponse.json({
      message: "Certificate created successfully",
      certificate: {
        id: certificate._id.toString(),
        certificateNumber: certificate.certificateNumber,
        certificationStatus: certificate.certificationStatus
      }
    });
  } catch (error: any) {
    console.error("Certificate creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create certificate" },
      { status: 500 }
    );
  }
}
