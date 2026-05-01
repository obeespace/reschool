import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import AcademicYear from "@/app/models/AcademicYear";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

function formatYear(yearStr: string, format: string): string {
  const clean = String(yearStr || "").replace(/\D/g, "");
  if (format === "YY") return clean.slice(-2);
  return clean.length >= 4 ? clean.slice(0, 4) : String(new Date().getFullYear());
}

async function generateAdmissionNumber(schoolId: mongoose.Types.ObjectId): Promise<string> {
  const settings = await AdmissionSettings.findOne({ schoolId }).lean();
  if (!settings) throw new Error("Admission settings not configured for this school");

  const activeYear = await AcademicYear.findOne({ schoolId, isActive: true }).lean();
  const yearBase = activeYear ? (activeYear as {name: string}).name.match(/\d{4}/)?.[0] || String(new Date().getFullYear()) : String(new Date().getFullYear());
  const yearToken = formatYear(yearBase, (settings as {yearFormat: string}).yearFormat);
  const prefix = (settings as {prefix: string}).prefix.trim().toUpperCase();
  const pattern = new RegExp(`^${prefix}/${yearToken}/`);

  const existing = await Student.find({ schoolId, admissionNumber: pattern }).select("admissionNumber").lean();
  let max = 0;
  for (const s of existing) {
    const parts = s.admissionNumber.split("/");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const next = String(max + 1).padStart((settings as {numberLength: number}).numberLength, "0");
  return `${prefix}/${yearToken}/${next}`;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    let admissionNumber = String(body?.admissionNumber || "").trim();
    const gender = body?.gender ? String(body.gender).trim() : null;
    const parsedDob = body?.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const dateOfBirth = parsedDob && Number.isFinite(parsedDob.getTime()) ? parsedDob : null;
    const classId = body?.classId ? String(body.classId).trim() : null;
    const parentFullName = String(body?.parentFullName || "").trim();
    const parentEmail = String(body?.parentEmail || "").trim().toLowerCase();
    const parentPhone = String(body?.parentPhone || "").trim();
    const parentPassword = String(body?.parentPassword || "").trim();

    // Optional enrichment fields
    const photoUrl = body?.photoUrl ? String(body.photoUrl).trim() : undefined;
    const track = body?.track ? String(body.track).trim().toUpperCase() : undefined;
    const house = body?.house ? String(body.house).trim() : undefined;
    const bloodGroup = body?.bloodGroup ? String(body.bloodGroup).trim() : undefined;
    const genotype = body?.genotype ? String(body.genotype).trim().toUpperCase() : undefined;
    const allergies = Array.isArray(body?.allergies) ? body.allergies.map(String).filter(Boolean) : undefined;
    const medicalConditions = Array.isArray(body?.medicalConditions) ? body.medicalConditions.map(String).filter(Boolean) : undefined;
    const emergencyContactName = body?.emergencyContactName ? String(body.emergencyContactName).trim() : undefined;
    const emergencyContactPhone = body?.emergencyContactPhone ? String(body.emergencyContactPhone).trim() : undefined;
    const isPrefect = body?.isPrefect === true;
    const prefectTitle = body?.prefectTitle ? String(body.prefectTitle).trim() : undefined;

    if (!fullName) return NextResponse.json({ error: "Full name is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    if (!admissionNumber) {
      try {
        admissionNumber = await generateAdmissionNumber(schoolId);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to generate admission number" }, { status: 400 });
      }
    }

    const dupCheck = await Student.findOne({ schoolId, admissionNumber }).lean();
    if (dupCheck) return NextResponse.json({ error: "A student with this admission number already exists" }, { status: 409 });

    let classOId: mongoose.Types.ObjectId | undefined;
    if (classId) {
      const cls = await Class.findOne({ schoolId, _id: new mongoose.Types.ObjectId(classId) }).lean();
      if (cls) classOId = (cls as { _id: mongoose.Types.ObjectId })._id;
    }

    const student = await Student.create({
      schoolId,
      fullName,
      admissionNumber,
      gender,
      dateOfBirth,
      currentClassId: classOId || undefined,
      ...(photoUrl !== undefined && { photoUrl }),
      ...(track !== undefined && { track }),
      ...(house !== undefined && { house }),
      ...(bloodGroup !== undefined && { bloodGroup }),
      ...(genotype !== undefined && { genotype }),
      ...(allergies !== undefined && { allergies }),
      ...(medicalConditions !== undefined && { medicalConditions }),
      ...(emergencyContactName !== undefined && { emergencyContactName }),
      ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
      ...(isPrefect && { isPrefect }),
      ...(prefectTitle !== undefined && { prefectTitle }),
    });

    let parentUserId: mongoose.Types.ObjectId | null = null;

    if (parentEmail) {
      const existing = await User.findOne({ schoolId, email: parentEmail }).lean();
      if (existing) {
        parentUserId = (existing as { _id: mongoose.Types.ObjectId })._id;
      } else {
        const hash = await bcrypt.hash(parentPassword || "changeme123", 10);
        const newParent = await User.create({
          schoolId,
          fullName: parentFullName || "Parent",
          email: parentEmail,
          passwordHash: hash,
          phone: parentPhone || undefined,
          role: "PARENT",
        });
        parentUserId = newParent._id;
      }

      await ParentWardLink.create({
        schoolId,
        parentId: parentUserId,
        studentId: student._id,
        isPrimary: true,
      });
    }

    return NextResponse.json({
      message: "Student created successfully",
      student: { _id: student._id.toString(), id: student._id.toString(), fullName, admissionNumber },
      parentId: parentUserId ? parentUserId.toString() : null,
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create student" }, { status: 500 });
  }
}
