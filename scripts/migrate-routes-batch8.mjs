import fs from "fs";
import path from "path";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── ai/jss3-recommendation ───────────────────────────────────────────────
write("app/api/ai/jss3-recommendation/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AuditLog from "@/app/models/AuditLog";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

const SCIENCE_KEYWORDS = ["Biology", "Chemistry", "Physics", "Further Mathematics", "Agricultural Science", "Technical Drawing"];
const COMMERCIAL_KEYWORDS = ["Economics", "Commerce", "Accounting", "Business Studies", "Book Keeping"];
const ARTS_KEYWORDS = ["Literature in English", "Government", "History", "Christian Religious Studies", "Islamic Studies", "French", "Yoruba", "Hausa", "Igbo"];

function computeTrackScore(subjectNames: string[], scores: Map<string, number>, keywords: string[]): number {
  let total = 0; let count = 0;
  for (const [name, score] of scores) {
    if (keywords.some((k) => name.toLowerCase().includes(k.toLowerCase()))) { total += score; count++; }
  }
  return count > 0 ? total / count : 0;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();

    const scores = await Score.find({ schoolId, studentId: new mongoose.Types.ObjectId(studentId), ...(activeTerm ? { academicYearId: activeTerm.academicYearId } : {}) }).lean();
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectNameMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      const name = subjectNameMap.get(s.subjectId.toString()) || "";
      scoreMap.set(name, Math.max(scoreMap.get(name) || 0, s.total ?? s.exam ?? 0));
    }

    const scienceScore = computeTrackScore([], scoreMap, SCIENCE_KEYWORDS);
    const commercialScore = computeTrackScore([], scoreMap, COMMERCIAL_KEYWORDS);
    const artsScore = computeTrackScore([], scoreMap, ARTS_KEYWORDS);

    const scores3 = [
      { track: "Science", score: scienceScore },
      { track: "Commercial", score: commercialScore },
      { track: "Arts", score: artsScore },
    ].sort((a, b) => b.score - a.score);

    const recommendation = scores3[0].track;

    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();
    await AuditLog.create({
      schoolId,
      userId: new mongoose.Types.ObjectId(user.userId),
      action: "AI_JSS3_RECOMMENDATION_GENERATED",
      meta: { studentId, recommendation, scores: scores3, studentName: student ? (student as {fullName: string}).fullName : "Unknown" },
    });

    return NextResponse.json({ studentId, recommendation, scores: scores3, confidence: scores3[0].score > 50 ? "HIGH" : "LOW" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate recommendation" }, { status: 500 });
  }
}
`);

// ─── ai/sss3-recommendation ───────────────────────────────────────────────
write("app/api/ai/sss3-recommendation/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import AuditLog from "@/app/models/AuditLog";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

const CLUSTERS: Record<string, string[]> = {
  "Medicine/Science": ["Biology", "Chemistry", "Physics", "Mathematics"],
  "Engineering/Tech": ["Mathematics", "Physics", "Technical Drawing", "Further Mathematics"],
  "Law/Humanities": ["Literature in English", "Government", "History", "English Language"],
  "Business/Economics": ["Economics", "Commerce", "Accounting", "Mathematics"],
  "Education": ["English Language", "Mathematics"],
  "Agriculture": ["Agricultural Science", "Biology", "Chemistry"],
};

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const scores = await Score.find({ schoolId, studentId: new mongoose.Types.ObjectId(studentId) }).lean();
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectNameMap = new Map(subjects.map((s) => [s._id.toString(), s.name]));

    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      const name = subjectNameMap.get(s.subjectId.toString()) || "";
      scoreMap.set(name, Math.max(scoreMap.get(name) || 0, s.total ?? s.exam ?? 0));
    }

    const clusterScores = Object.entries(CLUSTERS).map(([cluster, keywords]) => {
      const matched = keywords.filter((k) => [...scoreMap.keys()].some((n) => n.toLowerCase().includes(k.toLowerCase())));
      const avg = matched.length > 0 ? matched.reduce((a, k) => a + ([...scoreMap.entries()].find(([n]) => n.toLowerCase().includes(k.toLowerCase()))?.[1] ?? 0), 0) / matched.length : 0;
      return { cluster, score: Math.round(avg), matched };
    }).sort((a, b) => b.score - a.score);

    const recommendation = clusterScores[0].cluster;
    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();

    await AuditLog.create({
      schoolId,
      userId: new mongoose.Types.ObjectId(user.userId),
      action: "AI_SSS3_RECOMMENDATION_GENERATED",
      meta: { studentId, recommendation, clusterScores: clusterScores.slice(0, 3), studentName: student ? (student as {fullName: string}).fullName : "Unknown" },
    });

    return NextResponse.json({ studentId, recommendation, clusterScores: clusterScores.slice(0, 3) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate SSS3 recommendation" }, { status: 500 });
  }
}
`);

// ─── ai/recommendation-history ────────────────────────────────────────────
write("app/api/ai/recommendation-history/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AuditLog from "@/app/models/AuditLog";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const studentId = searchParams.get("studentId");

    const filter: Record<string, unknown> = {
      schoolId,
      action: { $in: ["AI_JSS3_RECOMMENDATION_GENERATED", "AI_SSS3_RECOMMENDATION_GENERATED"] },
    };
    if (studentId) filter["meta.studentId"] = studentId;

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ history: logs.map((l) => ({ _id: l._id.toString(), action: l.action, meta: l.meta, createdAt: l.createdAt })) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch recommendation history" }, { status: 500 });
  }
}
`);

// ─── certificates/manage ──────────────────────────────────────────────────
write("app/api/certificates/manage/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const filter: Record<string, unknown> = { schoolId };
    if (studentId) filter.studentId = new mongoose.Types.ObjectId(studentId);

    const certs = await Certificate.find(filter).lean();
    return NextResponse.json({ certificates: certs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch certificates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const certificateType = String(body?.certificateType || "COMPLETION").trim().toUpperCase();
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const certificateNumber = \`CERT/\${schoolId.toString().slice(-4).toUpperCase()}/\${Date.now()}\`;

    const cert = await Certificate.create({
      schoolId,
      studentId: new mongoose.Types.ObjectId(studentId),
      certificateType,
      certificateNumber,
      signatureApprovalStatus: "PENDING",
      isVerifiable: false,
      reprintCount: 0,
      reprintHistory: [],
    });

    return NextResponse.json({ message: "Certificate created", certificateId: cert._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create certificate" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await connectDB();
    await Certificate.deleteOne({ _id: new mongoose.Types.ObjectId(id), schoolId: new mongoose.Types.ObjectId(admin.schoolId) });
    return NextResponse.json({ message: "Certificate deleted" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete certificate" }, { status: 500 });
  }
}
`);

// ─── certificates/sign ────────────────────────────────────────────────────
write("app/api/certificates/sign/route.ts", `
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
`);

// ─── certificates/reprint ─────────────────────────────────────────────────
write("app/api/certificates/reprint/route.ts", `
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
      {
        $inc: { reprintCount: 1 },
        $push: { reprintHistory: { reprintedBy: new mongoose.Types.ObjectId(admin.userId), reprintedAt: new Date(), reason: body?.reason || null } },
      },
      { new: true }
    ).lean();

    if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    return NextResponse.json({ message: "Reprint recorded", certificateId: id, reprintCount: (cert as {reprintCount: number}).reprintCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record reprint" }, { status: 500 });
  }
}
`);

// ─── certificates/verify ──────────────────────────────────────────────────
write("app/api/certificates/verify/route.ts", `
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const certificateNumber = searchParams.get("certificateNumber");
    const qrCode = searchParams.get("qrCode");
    if (!certificateNumber && !qrCode) return NextResponse.json({ error: "certificateNumber or qrCode is required" }, { status: 400 });

    await connectDB();
    const filter = certificateNumber ? { certificateNumber } : { qrCode };
    const cert = await Certificate.findOne(filter).lean();

    if (!cert) return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
    if (!(cert as {isVerifiable: boolean}).isVerifiable) return NextResponse.json({ valid: false, error: "Certificate is not verifiable" }, { status: 403 });

    return NextResponse.json({ valid: true, certificate: cert });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 500 });
  }
}
`);

// ─── superadmin/analytics ─────────────────────────────────────────────────
write("app/api/superadmin/analytics/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import User from "@/app/models/User";
import Student from "@/app/models/Students";
import Subscription from "@/app/models/Subscription";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "SUPERADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schools = await School.find().lean();
    const schoolIds = schools.map((s) => (s as {_id: mongoose.Types.ObjectId})._id);

    const [userCounts, studentCounts, subscriptions] = await Promise.all([
      User.aggregate([
        { $match: { schoolId: { $in: schoolIds } } },
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      ]),
      Student.aggregate([
        { $match: { schoolId: { $in: schoolIds } } },
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      ]),
      Subscription.find({ schoolId: { $in: schoolIds } }).lean(),
    ]);

    const userMap = new Map(userCounts.map((u) => [u._id.toString(), u.count]));
    const studentMap = new Map(studentCounts.map((s) => [s._id.toString(), s.count]));
    const subMap = new Map(subscriptions.map((s) => [s.schoolId.toString(), s]));

    return NextResponse.json({
      totalSchools: schools.length,
      schools: schools.map((s) => {
        const sid = (s as {_id: mongoose.Types.ObjectId})._id.toString();
        const sub = subMap.get(sid);
        return {
          _id: sid,
          name: (s as {name: string}).name,
          domainSlug: (s as {domainSlug?: string}).domainSlug,
          userCount: userMap.get(sid) || 0,
          studentCount: studentMap.get(sid) || 0,
          subscription: sub ? { plan: (sub as {plan: string}).plan, status: (sub as {status: string}).status, expiresAt: (sub as {expiresAt?: Date}).expiresAt } : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch superadmin analytics" }, { status: 500 });
  }
}
`);

// ─── export routes (attendance, audit, certificates, class-ranking, coordinate, transcript) ─────
const exportRoutes = {
  "attendance": `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const filter: Record<string, unknown> = { schoolId };
    if (activeTerm) filter.termId = activeTerm._id;
    const classId = searchParams.get("classId");
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    const records = await AttendanceRecord.find(filter).lean();
    const studentIds = [...new Set(records.flatMap((r) => r.records.map((e: {studentId: mongoose.Types.ObjectId}) => e.studentId.toString())))];
    const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).select("_id fullName admissionNumber").lean() : [];
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const rows = records.flatMap((rec) => rec.records.map((r: {studentId: mongoose.Types.ObjectId; status: string}) => {
      const s = studentMap.get(r.studentId.toString());
      return { date: rec.attendanceDate, classId: rec.classId.toString(), studentId: r.studentId.toString(), studentName: s?.fullName || "Unknown", admissionNumber: s?.admissionNumber || "", status: r.status };
    }));
    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
`,
  "audit": `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AuditLog from "@/app/models/AuditLog";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const logs = await AuditLog.find({ schoolId }).sort({ createdAt: -1 }).limit(1000).lean();
    return NextResponse.json({ data: logs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
`,
  "certificates": `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const certs = await Certificate.find({ schoolId }).lean();
    return NextResponse.json({ data: certs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
`,
  "class-ranking": `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ReportCard from "@/app/models/ReportCard";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    if (!activeTerm) return NextResponse.json({ data: [] });
    const filter: Record<string, unknown> = { schoolId, termId: activeTerm._id };
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);
    const reports = await ReportCard.find(filter).sort({ average: -1 }).lean();
    const studentIds = reports.map((r) => r.studentId);
    const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).lean() : [];
    const studentMap = new Map(students.map((s) => [s._id.toString(), (s as {fullName: string}).fullName]));
    return NextResponse.json({
      data: reports.map((r, i) => ({ position: r.position ?? (i + 1), studentId: r.studentId.toString(), studentName: studentMap.get(r.studentId.toString()) || "Unknown", average: r.average, classId: r.classId.toString() }))
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
`,
  "coordinate": `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const students = await Student.find({ schoolId }).lean();
    const studentIds = students.map((s) => s._id);
    const wardLinks = studentIds.length ? await ParentWardLink.find({ schoolId, studentId: { $in: studentIds } }).lean() : [];
    const parentIds = [...new Set(wardLinks.map((w) => w.parentId))];
    const parents = parentIds.length ? await User.find({ _id: { $in: parentIds } }).select("_id fullName email").lean() : [];
    const parentMap = new Map(parents.map((p) => [p._id.toString(), p]));
    const classIds = [...new Set(students.map((s) => s.currentClassId?.toString()).filter(Boolean))];
    const classes = classIds.length ? await Class.find({ _id: { $in: classIds } }).lean() : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));
    const parentByStudent = new Map<string, string>();
    for (const link of wardLinks) parentByStudent.set(link.studentId.toString(), link.parentId.toString());
    return NextResponse.json({
      data: students.map((s) => {
        const parentId = parentByStudent.get(s._id.toString());
        const parent = parentId ? parentMap.get(parentId) : null;
        const cls = s.currentClassId ? classMap.get(s.currentClassId.toString()) : null;
        return {
          studentName: (s as {fullName: string}).fullName,
          admissionNumber: (s as {admissionNumber: string}).admissionNumber,
          class: cls ? \`\${(cls as {level: string}).level} \${(cls as {arm: string}).arm}\` : "N/A",
          parentName: parent ? (parent as {fullName: string}).fullName : "N/A",
          parentEmail: parent ? (parent as {email: string}).email : "N/A",
        };
      })
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
`,
  "transcript": `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Score from "@/app/models/Score";
import Student from "@/app/models/Students";
import Subject from "@/app/models/Subject";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const student = await Student.findOne({ schoolId, _id: new mongoose.Types.ObjectId(studentId) }).lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    const scores = await Score.find({ schoolId, studentId: new mongoose.Types.ObjectId(studentId) }).lean();
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = subjectIds.length ? await Subject.find({ _id: { $in: subjectIds } }).lean() : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), (s as {name: string}).name]));
    return NextResponse.json({
      student: { fullName: (student as {fullName: string}).fullName, admissionNumber: (student as {admissionNumber: string}).admissionNumber },
      data: scores.map((s) => ({
        subjectName: subjectMap.get(s.subjectId.toString()) || "Unknown",
        term: s.term,
        classwork: s.classwork,
        homework: s.homework,
        test: s.test,
        exam: s.exam,
        total: s.total,
      }))
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
`,
};

for (const [name, content] of Object.entries(exportRoutes)) {
  write(`app/api/export/${name}/route.ts`, content);
}

console.log("\\n✅ Batch 8 done: AI (jss3, sss3, history), certificates (manage, sign, reprint, verify), superadmin/analytics, export routes (6)");
