import fs from "fs";
import path from "path";

const root = process.cwd();
const write = (rel, content) =>
  fs.writeFileSync(path.join(root, rel), content.trimStart(), "utf8");

// ─── terms/active ───────────────────────────────────────────────────────────
write("app/api/terms/active/route.ts", `
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();

    if (!activeTerm) {
      return NextResponse.json({ error: "No active term found" }, { status: 404 });
    }

    const academicYear = await AcademicYear.findById(activeTerm.academicYearId).select("name").lean();

    return NextResponse.json({
      term: {
        ...activeTerm,
        _id: (activeTerm._id as mongoose.Types.ObjectId).toString(),
        academicYearId: academicYear
          ? { _id: (academicYear._id as mongoose.Types.ObjectId).toString(), name: academicYear.name }
          : null,
        isActive: activeTerm.isActive,
      },
      isPaid: activeTerm.isPaid,
      isClosed: activeTerm.isClosed,
    });
  } catch (error: unknown) {
    console.error("Fetch active term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch active term" },
      { status: 500 }
    );
  }
}
`);

// ─── terms/list ─────────────────────────────────────────────────────────────
write("app/api/terms/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const onlyPaid = searchParams.get("onlyPaid") === "true";
    const bypassCache = shouldBypassServerCache(req);
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const payload = await getOrSetServerCache({
      key: \`terms:list:\${user.schoolId}:\${academicYearId || "all"}:\${onlyPaid ? "paid" : "all"}\`,
      ttlMs: 15_000,
      bypass: bypassCache,
      factory: async () => {
        const filter: Record<string, unknown> = { schoolId };
        if (academicYearId) filter.academicYearId = new mongoose.Types.ObjectId(academicYearId);
        if (onlyPaid) filter.isPaid = true;

        const dbTerms = await Term.find(filter).sort({ startDate: -1 }).lean();
        const yearIds = [...new Set(dbTerms.map((t) => (t.academicYearId as mongoose.Types.ObjectId).toString()))];
        const dbYears = yearIds.length
          ? await AcademicYear.find({ _id: { $in: yearIds } }).select("name").lean()
          : [];
        const yearMap = new Map(dbYears.map((y) => [(y._id as mongoose.Types.ObjectId).toString(), y.name]));

        return {
          terms: dbTerms.map((t) => ({
            _id: (t._id as mongoose.Types.ObjectId).toString(),
            id: (t._id as mongoose.Types.ObjectId).toString(),
            schoolId: (t.schoolId as mongoose.Types.ObjectId).toString(),
            academicYearId: yearMap.has((t.academicYearId as mongoose.Types.ObjectId).toString())
              ? { _id: (t.academicYearId as mongoose.Types.ObjectId).toString(), name: yearMap.get((t.academicYearId as mongoose.Types.ObjectId).toString()) }
              : null,
            termNumber: t.termNumber,
            startDate: t.startDate,
            endDate: t.endDate,
            isActive: t.isActive,
            isPaid: t.isPaid,
            isClosed: t.isClosed,
            paymentDate: t.paymentDate,
            paymentReference: t.paymentReference,
          })),
        };
      },
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (error: unknown) {
    console.error("Fetch terms error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch terms" },
      { status: 500 }
    );
  }
}
`);

// ─── terms/close ────────────────────────────────────────────────────────────
write("app/api/terms/close/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import mongoose from "mongoose";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { termId } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const updated = await Term.findOneAndUpdate(
      { _id: termId, schoolId },
      { isClosed: true, isActive: false },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    invalidateServerCacheByPrefix(\`terms:list:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`admin:stats:\${admin.schoolId}\`);
    invalidateServerCacheByPrefix(\`reports:list:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`parents:dashboard:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`parents:class-ranking:\${admin.schoolId}:\`);

    return NextResponse.json({
      message: "Term closed successfully. No further edits allowed.",
      termId: (updated._id as mongoose.Types.ObjectId).toString(),
    });
  } catch (error: unknown) {
    console.error("Close term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close term" },
      { status: 500 }
    );
  }
}
`);

// ─── terms/mark-paid ────────────────────────────────────────────────────────
write("app/api/terms/mark-paid/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Term from "@/app/models/Term";
import mongoose from "mongoose";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { termId, paymentReference } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    await connectDB();
    const now = new Date();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const updated = await Term.findOneAndUpdate(
      { _id: termId, schoolId },
      { isPaid: true, paymentDate: now, paymentReference: paymentReference || null },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    invalidateServerCacheByPrefix(\`terms:list:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`admin:stats:\${admin.schoolId}\`);
    invalidateServerCacheByPrefix(\`reports:list:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`parents:dashboard:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`parents:class-ranking:\${admin.schoolId}:\`);

    return NextResponse.json({
      message: "Term marked as paid successfully",
      term: {
        termId: (updated._id as mongoose.Types.ObjectId).toString(),
        termNumber: updated.termNumber,
        isPaid: updated.isPaid,
        paymentDate: updated.paymentDate,
      },
    });
  } catch (error: unknown) {
    console.error("Mark term paid error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark term as paid" },
      { status: 500 }
    );
  }
}
`);

// ─── terms/set-active ───────────────────────────────────────────────────────
write("app/api/terms/set-active/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import mongoose from "mongoose";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { termId } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const targetTerm = await Term.findOne({ _id: termId, schoolId }).select("academicYearId").lean();
    if (!targetTerm) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    await Term.updateMany({ schoolId }, { isActive: false });
    await AcademicYear.updateMany({ schoolId }, { isActive: false });
    await Term.findByIdAndUpdate(termId, { isActive: true });
    await AcademicYear.findByIdAndUpdate(targetTerm.academicYearId, { isActive: true });

    invalidateServerCacheByPrefix(\`terms:list:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`academic-years:list:\${admin.schoolId}\`);
    invalidateServerCacheByPrefix(\`admin:stats:\${admin.schoolId}\`);
    invalidateServerCacheByPrefix(\`reports:list:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`parents:dashboard:\${admin.schoolId}:\`);
    invalidateServerCacheByPrefix(\`parents:class-ranking:\${admin.schoolId}:\`);

    return NextResponse.json({ message: "Term activated successfully", termId });
  } catch (error: unknown) {
    console.error("Set active term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set active term" },
      { status: 500 }
    );
  }
}
`);

// ─── subjects ───────────────────────────────────────────────────────────────
write("app/api/subjects/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const rows = await Subject.find({ schoolId }).lean();

    return NextResponse.json({
      subjects: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        name: row.name,
        code: row.code || row.name.split(/\\s+/).map((p: string) => p[0]?.toUpperCase() || "").join("").slice(0, 6),
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch subjects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const existing = await Subject.findOne({ schoolId, name }).lean();
    if (existing) {
      return NextResponse.json({
        message: "Subject already exists",
        subject: {
          _id: (existing._id as mongoose.Types.ObjectId).toString(),
          id: (existing._id as mongoose.Types.ObjectId).toString(),
          name: existing.name,
        },
      });
    }

    const code = name.split(/\\s+/).map((p: string) => p[0]?.toUpperCase() || "").join("").slice(0, 6);
    const subject = await Subject.create({ schoolId, name, code });

    return NextResponse.json({
      message: "Subject created successfully",
      subject: {
        _id: (subject._id as mongoose.Types.ObjectId).toString(),
        id: (subject._id as mongoose.Types.ObjectId).toString(),
        name: subject.name,
        code: subject.code,
      },
    });
  } catch (error: unknown) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subject" },
      { status: 500 }
    );
  }
}
`);

// ─── classes/create ─────────────────────────────────────────────────────────
write("app/api/classes/create/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ClassModel from "@/app/models/Class";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const level = String(body?.level || "").trim().toUpperCase();
    const arm = String(body?.arm || "").trim().toUpperCase();

    if (!level || !arm) {
      return NextResponse.json({ error: "Level and arm are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const existing = await ClassModel.findOne({ schoolId, level, arm }).lean();

    if (existing) {
      return NextResponse.json({
        message: "Class already existed; section ensured",
        className: \`\${level} \${arm}\`,
        class: {
          _id: (existing._id as mongoose.Types.ObjectId).toString(),
          id: (existing._id as mongoose.Types.ObjectId).toString(),
          name: \`\${level} \${arm}\`,
          level,
          arm,
        },
      });
    }

    const cls = await ClassModel.create({ schoolId, level, arm, subjectIds: [], studentIds: [] });

    return NextResponse.json({
      message: "Class created successfully",
      className: \`\${level} \${arm}\`,
      class: {
        _id: (cls._id as mongoose.Types.ObjectId).toString(),
        id: (cls._id as mongoose.Types.ObjectId).toString(),
        name: \`\${level} \${arm}\`,
        level,
        arm,
      },
    });
  } catch (error: unknown) {
    console.error("Create class error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class" },
      { status: 500 }
    );
  }
}
`);

// ─── classes/list ───────────────────────────────────────────────────────────
write("app/api/classes/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ClassModel from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const rows = await ClassModel.find({ schoolId }).lean();

    return NextResponse.json({
      classes: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        name: \`\${row.level} \${row.arm}\`,
        level: row.level,
        arm: row.arm,
        subjectIds: (row.subjectIds || []).map((id) => (id as mongoose.Types.ObjectId).toString()),
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch classes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch classes" },
      { status: 500 }
    );
  }
}
`);

// ─── classes/link-subjects ──────────────────────────────────────────────────
write("app/api/classes/link-subjects/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ClassModel from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const subjectIds: string[] = Array.isArray(body?.subjectIds)
      ? body.subjectIds.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [];

    if (!classId || subjectIds.length === 0) {
      return NextResponse.json({ error: "classId and at least one subjectId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const [classDoc, subjectDocs] = await Promise.all([
      ClassModel.findOne({ _id: classId, schoolId }).select("_id").lean(),
      Subject.find({ _id: { $in: subjectIds }, schoolId }).select("_id").lean(),
    ]);

    if (!classDoc || subjectDocs.length !== subjectIds.length) {
      return NextResponse.json({ error: "Class or one or more subjects not found" }, { status: 404 });
    }

    await ClassModel.findByIdAndUpdate(classId, {
      subjectIds: subjectIds.map((id) => new mongoose.Types.ObjectId(id)),
    });

    return NextResponse.json({ message: "Class subjects updated successfully" });
  } catch (error: unknown) {
    console.error("Link class subjects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link class subjects" },
      { status: 500 }
    );
  }
}
`);

// ─── students/list ──────────────────────────────────────────────────────────
write("app/api/students/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import ClassModel from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const rows = await Student.find({ schoolId }).lean();

    const classIds = [...new Set(rows.map((s) => s.currentClassId?.toString()).filter(Boolean))];
    const classes = classIds.length
      ? await ClassModel.find({ _id: { $in: classIds } }).select("level arm").lean()
      : [];
    const classMap = new Map(classes.map((c) => [(c._id as mongoose.Types.ObjectId).toString(), \`\${c.level} \${c.arm}\`]));

    return NextResponse.json({
      students: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        fullName: row.fullName,
        admissionNumber: row.admissionNumber,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        currentClass: row.currentClassId ? classMap.get((row.currentClassId as mongoose.Types.ObjectId).toString()) || null : null,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}
`);

// ─── students/by-class ──────────────────────────────────────────────────────
write("app/api/students/by-class/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classId = new URL(req.url).searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const rows = await Student.find({
      schoolId,
      currentClassId: new mongoose.Types.ObjectId(classId),
    }).lean();

    return NextResponse.json({
      students: rows.map((row) => ({
        _id: (row._id as mongoose.Types.ObjectId).toString(),
        id: (row._id as mongoose.Types.ObjectId).toString(),
        fullName: row.fullName,
        admissionNumber: row.admissionNumber,
        gender: row.gender,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch students by class error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}
`);

// ─── students/update/[id] ───────────────────────────────────────────────────
write("app/api/students/update/[id]/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 });
    }

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const admissionNumber = String(body?.admissionNumber || "").trim();
    const gender = body?.gender ? String(body.gender).trim() : null;
    const dateOfBirth = body?.dateOfBirth ? new Date(body.dateOfBirth) : null;

    if (!fullName || !admissionNumber) {
      return NextResponse.json({ error: "Full name and admission number are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    await Student.findOneAndUpdate({ _id: id, schoolId }, { fullName, admissionNumber, gender, dateOfBirth });

    return NextResponse.json({
      message: "Student updated successfully",
      student: { id, fullName, admissionNumber, gender, dateOfBirth },
    });
  } catch (error: unknown) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update student" },
      { status: 500 }
    );
  }
}
`);

// ─── students/delete/[id] ───────────────────────────────────────────────────
write("app/api/students/delete/[id]/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    await Student.findOneAndDelete({ _id: id, schoolId });

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete student" },
      { status: 500 }
    );
  }
}
`);

// ─── students/link-parent ───────────────────────────────────────────────────
write("app/api/students/link-parent/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "").trim();
    const parentId = String(body?.parentId || "").trim();
    const relationship = String(body?.relationship || "GUARDIAN").trim().toUpperCase();
    const isPrimary = body?.isPrimary === true;

    if (!studentId || !parentId) {
      return NextResponse.json({ error: "studentId and parentId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const [studentDoc, parentDoc] = await Promise.all([
      Student.findOne({ _id: studentId, schoolId }).select("_id").lean(),
      User.findOne({ _id: parentId, schoolId, role: "PARENT" }).select("_id").lean(),
    ]);

    if (!studentDoc || !parentDoc) {
      return NextResponse.json({ error: "Student or parent not found" }, { status: 404 });
    }

    if (isPrimary) {
      await ParentWardLink.updateMany({ schoolId, studentId: new mongoose.Types.ObjectId(studentId) }, { isPrimary: false });
    }

    await ParentWardLink.findOneAndUpdate(
      { schoolId, parentId: new mongoose.Types.ObjectId(parentId), studentId: new mongoose.Types.ObjectId(studentId) },
      { relationship, isPrimary },
      { upsert: true }
    );

    return NextResponse.json({ message: "Parent linked successfully" });
  } catch (error: unknown) {
    console.error("Link parent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link parent" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const parentId = String(searchParams.get("parentId") || "").trim();

    if (!studentId || !parentId) {
      return NextResponse.json({ error: "studentId and parentId are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    await ParentWardLink.findOneAndDelete({
      schoolId,
      studentId: new mongoose.Types.ObjectId(studentId),
      parentId: new mongoose.Types.ObjectId(parentId),
    });

    return NextResponse.json({ message: "Parent link removed successfully" });
  } catch (error: unknown) {
    console.error("Unlink parent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlink parent" },
      { status: 500 }
    );
  }
}
`);

console.log("✅ Batch 1 done: terms, subjects, classes, students CRUD");
