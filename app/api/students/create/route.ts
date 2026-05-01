import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can create students" }, { status: 403 });
    }

    const {
      fullName,
      admissionNumber,
      dateOfBirth,
      gender,
      classId,
      parentId,
      parentFullName,
      parentEmail,
      parentPhone,
      parentPassword
    } = await req.json();

    if (!fullName || !classId || !admissionNumber) {
      return NextResponse.json(
        { error: "Full name, admission number, and class ID are required" },
        { status: 400 }
      );
    }

    const classDoc = await Class.findOne({
      _id: classId,
      schoolId: user.schoolId
    }).select("_id");

    if (!classDoc) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const existingStudent = await Student.findOne({
      schoolId: user.schoolId,
      admissionNumber
    }).select("_id");

    if (existingStudent) {
      return NextResponse.json({ error: "Admission number already exists" }, { status: 400 });
    }

    const normalizedEmail = typeof parentEmail === "string" ? parentEmail.trim().toLowerCase() : "";
    const normalizedPhone = typeof parentPhone === "string" ? parentPhone.trim() : "";

    let linkedParentId = parentId || null;
    let temporaryParentPassword: string | null = null;

    if (linkedParentId) {
      const existingParentById = await User.findOne({
        _id: linkedParentId,
        schoolId: user.schoolId,
        role: "PARENT"
      }).select("_id");

      if (!existingParentById) {
        return NextResponse.json({ error: "Selected guardian account not found" }, { status: 404 });
      }
    } else if (normalizedEmail || normalizedPhone) {
      let parentByEmail: any = null;
      let parentByPhone: any = null;

      if (normalizedEmail) {
        const userWithEmail = await User.findOne({ email: normalizedEmail });
        if (userWithEmail) {
          if (userWithEmail.role !== "PARENT") {
            return NextResponse.json(
              { error: "Email already belongs to a non-guardian account" },
              { status: 400 }
            );
          }

          if (userWithEmail.schoolId?.toString() !== user.schoolId) {
            return NextResponse.json(
              { error: "Guardian email belongs to a different school" },
              { status: 400 }
            );
          }

          parentByEmail = userWithEmail;
        }
      }

      if (normalizedPhone) {
        parentByPhone = await User.findOne({
          schoolId: user.schoolId,
          role: "PARENT",
          phoneNumber: normalizedPhone
        });
      }

      if (parentByEmail && parentByPhone && parentByEmail._id.toString() !== parentByPhone._id.toString()) {
        return NextResponse.json(
          { error: "Guardian email and phone match different accounts. Please select guardian manually." },
          { status: 400 }
        );
      }

      const matchedParent = parentByEmail || parentByPhone;

      if (matchedParent) {
        linkedParentId = matchedParent._id;
      } else {
        if (!parentFullName || !normalizedEmail) {
          return NextResponse.json(
            { error: "For new guardian account, guardian full name and email are required" },
            { status: 400 }
          );
        }

        const rawPassword = parentPassword || Math.random().toString(36).slice(2, 10);
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const newParent = await User.create({
          fullName: parentFullName,
          email: normalizedEmail,
          phoneNumber: normalizedPhone || null,
          passwordHash,
          role: "PARENT",
          schoolId: user.schoolId,
          isActive: true
        });

        linkedParentId = newParent._id;
        temporaryParentPassword = parentPassword ? null : rawPassword;
      }
    }

    const student = await Student.create({
      schoolId: user.schoolId,
      fullName,
      admissionNumber,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      parentId: linkedParentId,
      currentClassId: classId
    });

    await Class.findByIdAndUpdate(classId, {
      $addToSet: { studentIds: student._id }
    });

    return NextResponse.json({
      studentId: student._id.toString(),
      parentId: linkedParentId,
      temporaryParentPassword,
      message: "Student created successfully"
    });
  } catch (error: any) {
    console.error("Student creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create student" },
      { status: 500 }
    );
  }
}
