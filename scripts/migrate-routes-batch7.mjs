import fs from "fs";
import path from "path";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── students/create ──────────────────────────────────────────────────────
write("app/api/students/create/route.ts", `
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
  const clean = String(yearStr || "").replace(/\\D/g, "");
  if (format === "YY") return clean.slice(-2);
  return clean.length >= 4 ? clean.slice(0, 4) : String(new Date().getFullYear());
}

async function generateAdmissionNumber(schoolId: mongoose.Types.ObjectId): Promise<string> {
  const settings = await AdmissionSettings.findOne({ schoolId }).lean();
  if (!settings) throw new Error("Admission settings not configured for this school");

  const activeYear = await AcademicYear.findOne({ schoolId, isActive: true }).lean();
  const yearBase = activeYear ? (activeYear as {name: string}).name.match(/\\d{4}/)?.[0] || String(new Date().getFullYear()) : String(new Date().getFullYear());
  const yearToken = formatYear(yearBase, (settings as {yearFormat: string}).yearFormat);
  const prefix = (settings as {prefix: string}).prefix.trim().toUpperCase();
  const pattern = new RegExp(\`^\${prefix}/\${yearToken}/\`);

  const existing = await Student.find({ schoolId, admissionNumber: pattern }).select("admissionNumber").lean();
  let max = 0;
  for (const s of existing) {
    const parts = s.admissionNumber.split("/");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const next = String(max + 1).padStart((settings as {numberLength: number}).numberLength, "0");
  return \`\${prefix}/\${yearToken}/\${next}\`;
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
`);

// ─── students/[id]/transcript ─────────────────────────────────────────────
write("app/api/students/[id]/transcript/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Score from "@/app/models/Score";
import ReportCard from "@/app/models/ReportCard";
import Subject from "@/app/models/Subject";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const studentId = new mongoose.Types.ObjectId(id);

    const student = await Student.findOne({ schoolId, _id: studentId }).lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const [scores, reportCards, subjects, terms, years] = await Promise.all([
      Score.find({ schoolId, studentId }).lean(),
      ReportCard.find({ schoolId, studentId }).lean(),
      Subject.find({ schoolId }).lean(),
      Term.find({ schoolId }).lean(),
      AcademicYear.find({ schoolId }).lean(),
    ]);

    const subjectMap = new Map((subjects as {_id: mongoose.Types.ObjectId; name: string}[]).map((s) => [s._id.toString(), s.name]));
    const termMap = new Map((terms as {_id: mongoose.Types.ObjectId; termNumber: number; academicYearId: mongoose.Types.ObjectId}[]).map((t) => [t._id.toString(), t]));
    const yearMap = new Map((years as {_id: mongoose.Types.ObjectId; name: string}[]).map((y) => [y._id.toString(), y.name]));

    return NextResponse.json({
      student: { _id: (student as {_id: mongoose.Types.ObjectId}).._id.toString(), fullName: (student as {fullName: string}).fullName, admissionNumber: (student as {admissionNumber: string}).admissionNumber },
      scores: scores.map((s) => ({
        subjectId: s.subjectId.toString(),
        subjectName: subjectMap.get(s.subjectId.toString()) || "Unknown",
        term: s.term,
        academicYear: yearMap.get(s.academicYearId?.toString() || "") || "Unknown",
        classwork: s.classwork,
        homework: s.homework,
        test: s.test,
        exam: s.exam,
        total: s.total,
      })),
      reportCards: reportCards.map((r) => ({
        _id: r._id.toString(),
        termId: r.termId.toString(),
        average: r.average,
        position: r.position,
        isReleased: Boolean(r.approvedBy),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch transcript" }, { status: 500 });
  }
}
`);

// ─── students/[id]/lifecycle-record ──────────────────────────────────────
write("app/api/students/[id]/lifecycle-record/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import StudentLifecycleRecord from "@/app/models/StudentLifecycleRecord";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const record = await StudentLifecycleRecord.findOne({ schoolId, studentId: new mongoose.Types.ObjectId(id) }).lean();
    return NextResponse.json({ record: record || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch lifecycle record" }, { status: 500 });
  }
}
`);

// ─── students/[id]/certificate-status ────────────────────────────────────
write("app/api/students/[id]/certificate-status/route.ts", `
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
`);

// ─── classes/[id] ─────────────────────────────────────────────────────────
write("app/api/classes/[id]/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const classId = new mongoose.Types.ObjectId(id);

    const cls = await Class.findOne({ schoolId, _id: classId }).lean();
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const [students, subjectIds] = await Promise.all([
      Student.find({ schoolId, currentClassId: classId }).lean(),
      Class.findOne({ _id: classId }).select("subjectIds").lean(),
    ]);

    const linkedSubjectIds = ((subjectIds as {subjectIds?: mongoose.Types.ObjectId[]})?.subjectIds || []);
    const subjects = linkedSubjectIds.length
      ? await Subject.find({ _id: { $in: linkedSubjectIds } }).lean()
      : [];

    return NextResponse.json({
      class: {
        _id: (cls as {_id: mongoose.Types.ObjectId})._id.toString(),
        level: (cls as {level: string}).level,
        arm: (cls as {arm: string}).arm,
        name: \`\${(cls as {level: string}).level} \${(cls as {arm: string}).arm}\`.trim(),
        studentCount: students.length,
      },
      students: students.map((s) => ({
        _id: (s as {_id: mongoose.Types.ObjectId})._id.toString(),
        fullName: (s as {fullName: string}).fullName,
        admissionNumber: (s as {admissionNumber: string}).admissionNumber,
        gender: (s as {gender?: string}).gender,
      })),
      subjects: subjects.map((s) => ({ _id: (s as {_id: mongoose.Types.ObjectId})._id.toString(), name: (s as {name: string}).name })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch class" }, { status: 500 });
  }
}
`);

// ─── academics/promote ────────────────────────────────────────────────────
write("app/api/academics/promote/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import StudentLifecycleRecord from "@/app/models/StudentLifecycleRecord";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const fromClassId = searchParams.get("fromClassId");
    if (!fromClassId) return NextResponse.json({ error: "fromClassId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const students = await Student.find({ schoolId, currentClassId: new mongoose.Types.ObjectId(fromClassId) }).lean();
    return NextResponse.json({ students: students.map((s) => ({ _id: (s as {_id: mongoose.Types.ObjectId})._id.toString(), fullName: (s as {fullName: string}).fullName, admissionNumber: (s as {admissionNumber: string}).admissionNumber })), count: students.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to preview promotion" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const fromClassId = String(body?.fromClassId || "").trim();
    const toClassId = String(body?.toClassId || "").trim();
    const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds.map(String) : [];
    if (!fromClassId || !toClassId) return NextResponse.json({ error: "fromClassId and toClassId are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const fromClassOId = new mongoose.Types.ObjectId(fromClassId);
    const toClassOId = new mongoose.Types.ObjectId(toClassId);

    const toClass = await Class.findOne({ schoolId, _id: toClassOId }).lean();
    if (!toClass) return NextResponse.json({ error: "Target class not found" }, { status: 404 });

    const filter = studentIds.length
      ? { schoolId, _id: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) }, currentClassId: fromClassOId }
      : { schoolId, currentClassId: fromClassOId };

    const toPromote = await Student.find(filter).lean();
    const now = new Date();

    for (const student of toPromote) {
      await Student.updateOne({ _id: (student as {_id: mongoose.Types.ObjectId})._id }, { $set: { currentClassId: toClassOId } });
      await StudentLifecycleRecord.findOneAndUpdate(
        { schoolId, studentId: (student as {_id: mongoose.Types.ObjectId})._id },
        {
          $push: {
            events: {
              type: "PROMOTION",
              fromClassId: fromClassOId,
              toClassId: toClassOId,
              performedBy: new mongoose.Types.ObjectId(admin.userId),
              date: now,
            },
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ message: "Students promoted", promoted: toPromote.length, fromClassId, toClassId });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to promote students" }, { status: 500 });
  }
}
`);

// ─── terms/history-validation ─────────────────────────────────────────────
write("app/api/terms/history-validation/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const years = await AcademicYear.find({ schoolId }).lean();
    const terms = await Term.find({ schoolId }).lean();

    const termsByYear = new Map<string, typeof terms>();
    for (const t of terms) {
      const key = t.academicYearId.toString();
      if (!termsByYear.has(key)) termsByYear.set(key, []);
      termsByYear.get(key)!.push(t);
    }

    const history = years.map((y) => {
      const yearTerms = (termsByYear.get((y as {_id: mongoose.Types.ObjectId})._id.toString()) || []).sort(
        (a, b) => a.termNumber - b.termNumber
      );
      const valid = yearTerms.every((t, i, arr) => {
        if (i === 0) return true;
        return arr[i - 1].isClosed || !t.isActive;
      });
      return {
        _id: (y as {_id: mongoose.Types.ObjectId})._id.toString(),
        name: (y as {name: string}).name,
        isActive: (y as {isActive: boolean}).isActive,
        terms: yearTerms.map((t) => ({
          _id: (t as {_id: mongoose.Types.ObjectId})._id.toString(),
          termNumber: t.termNumber,
          isActive: t.isActive,
          isPaid: t.isPaid,
          isClosed: t.isClosed,
        })),
        valid,
      };
    });

    return NextResponse.json({ history });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch term history" }, { status: 500 });
  }
}
`);

console.log("\\n✅ Batch 7 done: students (create, transcript, lifecycle-record, certificate-status), classes/[id], academics/promote, terms/history-validation");
