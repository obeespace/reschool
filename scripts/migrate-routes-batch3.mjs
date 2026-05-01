import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── teachers/create (GET own profile + POST create teacher) ─────────────
write("app/api/teachers/create/route.ts", `
import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

async function buildProfile(schoolId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
  const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
  if (!profile) return { classTeacherOf: null, subjectsAndClasses: [] };
  const classTeacherOfId = profile.classTeacherOf ? profile.classTeacherOf.toString() : null;
  let classTeacherOf = null;
  if (classTeacherOfId) {
    const cls = await Class.findById(classTeacherOfId).lean() as {_id: mongoose.Types.ObjectId; level: string; arm: string} | null;
    if (cls) classTeacherOf = { _id: cls._id.toString(), name: \`\${cls.level} \${cls.arm}\`.trim() };
  }
  const subjectsAndClasses = await Promise.all(
    (profile.subjectsAndClasses || []).map(async (entry: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
      subjectId: { _id: entry.subjectId.toString() },
      classIds: entry.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString() })),
    }))
  );
  return { classTeacherOf, subjectsAndClasses };
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);
    const profile = await buildProfile(schoolId, userId);
    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const classTeacherOf = body?.classTeacherOf ? String(body.classTeacherOf).trim() : "";
    const subjectsAndClasses = Array.isArray(body?.subjectsAndClasses) ? body.subjectsAndClasses : [];

    if (!fullName || !email || password.length < 6) {
      return NextResponse.json({ error: "Full name, valid email, and password (min 6 chars) are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const existing = await User.findOne({ schoolId, email }).lean();
    if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await User.create({ schoolId, fullName, email, passwordHash, role: "TEACHER" });
    const teacherId = teacher._id;

    // Build TeacherProfile
    const profileData: { schoolId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; classTeacherOf?: mongoose.Types.ObjectId; subjectsAndClasses: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}[] } = {
      schoolId,
      userId: teacherId,
      subjectsAndClasses: [],
    };

    if (classTeacherOf) {
      const classExists = await Class.findOne({ schoolId, _id: new mongoose.Types.ObjectId(classTeacherOf) }).lean();
      if (classExists) {
        // Clear old class teacher assignment
        await TeacherProfile.updateMany({ schoolId, classTeacherOf: new mongoose.Types.ObjectId(classTeacherOf) }, { $unset: { classTeacherOf: "" } });
        profileData.classTeacherOf = new mongoose.Types.ObjectId(classTeacherOf);
      }
    }

    for (const assignment of subjectsAndClasses) {
      const subjectId = String(assignment?.subjectId || "").trim();
      const classIds = Array.isArray(assignment?.classIds) ? assignment.classIds : [];
      if (!subjectId) continue;
      profileData.subjectsAndClasses.push({
        subjectId: new mongoose.Types.ObjectId(subjectId),
        classIds: classIds.map((id: string) => new mongoose.Types.ObjectId(id)).filter(Boolean),
      });
    }

    await TeacherProfile.create(profileData);
    const profile = await buildProfile(schoolId, teacherId);

    return NextResponse.json({
      message: "Teacher created successfully",
      teacher: {
        _id: teacherId.toString(),
        id: teacherId.toString(),
        fullName,
        email,
        profile: { classTeacherOf: profile.classTeacherOf, subjectsAndClasses: profile.subjectsAndClasses },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create teacher" }, { status: 500 });
  }
}
`);

// ─── teachers/list ────────────────────────────────────────────────────────
write("app/api/teachers/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const teacherUsers = await User.find({ schoolId, role: "TEACHER" }).select("_id fullName email").lean();
    const profiles = await TeacherProfile.find({ schoolId }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const teachers = teacherUsers.map((t) => {
      const profile = profileMap.get(t._id.toString());
      return {
        _id: t._id.toString(),
        id: t._id.toString(),
        fullName: t.fullName,
        email: t.email,
        profile: profile
          ? {
              classTeacherOf: profile.classTeacherOf ? { _id: profile.classTeacherOf.toString() } : null,
              subjectsAndClasses: (profile.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
                subjectId: { _id: e.subjectId.toString() },
                classIds: e.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString() })),
              })),
            }
          : { classTeacherOf: null, subjectsAndClasses: [] },
      };
    });

    return NextResponse.json({ teachers });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teachers" }, { status: 500 });
  }
}
`);

// ─── teachers/[id] ────────────────────────────────────────────────────────
write("app/api/teachers/[id]/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const teacher = await User.findOne({ schoolId, _id: new mongoose.Types.ObjectId(id), role: "TEACHER" }).lean();
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const profile = await TeacherProfile.findOne({ schoolId, userId: new mongoose.Types.ObjectId(id) }).lean();

    return NextResponse.json({
      teacher: {
        _id: teacher._id.toString(),
        id: teacher._id.toString(),
        fullName: teacher.fullName,
        email: teacher.email,
        profile: profile
          ? {
              classTeacherOf: profile.classTeacherOf ? { _id: profile.classTeacherOf.toString() } : null,
              subjectsAndClasses: (profile.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
                subjectId: { _id: e.subjectId.toString() },
                classIds: e.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString() })),
              })),
            }
          : { classTeacherOf: null, subjectsAndClasses: [] },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher" }, { status: 500 });
  }
}
`);

// ─── teachers/[id]/assign-subject ─────────────────────────────────────────
write("app/api/teachers/[id]/assign-subject/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const subjectId = String(body?.subjectId || "").trim();
    const classIds: string[] = Array.isArray(body?.classIds) ? body.classIds.map(String) : [];
    if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);
    const subjectOId = new mongoose.Types.ObjectId(subjectId);
    const classOIds = classIds.map((cid) => new mongoose.Types.ObjectId(cid));

    const profile = await TeacherProfile.findOne({ schoolId, userId });
    if (!profile) {
      await TeacherProfile.create({ schoolId, userId, subjectsAndClasses: [{ subjectId: subjectOId, classIds: classOIds }] });
    } else {
      const idx = profile.subjectsAndClasses.findIndex((e: {subjectId: mongoose.Types.ObjectId}) => e.subjectId.toString() === subjectId);
      if (idx >= 0) profile.subjectsAndClasses[idx].classIds = classOIds;
      else profile.subjectsAndClasses.push({ subjectId: subjectOId, classIds: classOIds });
      await profile.save();
    }

    return NextResponse.json({ message: "Subject assigned" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign subject" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
`);

// ─── teachers/[id]/assign-class-teacher ──────────────────────────────────
write("app/api/teachers/[id]/assign-class-teacher/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);
    const classOId = new mongoose.Types.ObjectId(classId);

    const cls = await Class.findOne({ schoolId, _id: classOId }).lean();
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    // Clear old class teacher
    await TeacherProfile.updateMany({ schoolId, classTeacherOf: classOId }, { $unset: { classTeacherOf: "" } });

    await TeacherProfile.findOneAndUpdate(
      { schoolId, userId },
      { $set: { classTeacherOf: classOId } },
      { upsert: true }
    );

    return NextResponse.json({ message: "Class teacher assigned" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign class teacher" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
`);

// ─── teachers/[id]/remove-subject ─────────────────────────────────────────
write("app/api/teachers/[id]/remove-subject/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const subjectId = String(body?.subjectId || "").trim();
    if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);

    await TeacherProfile.updateOne(
      { schoolId, userId },
      { $pull: { subjectsAndClasses: { subjectId: new mongoose.Types.ObjectId(subjectId) } } }
    );

    return NextResponse.json({ message: "Subject removed" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to remove subject" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
`);

// ─── teachers/[id]/remove-class-teacher ──────────────────────────────────
write("app/api/teachers/[id]/remove-class-teacher/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(id);

    await TeacherProfile.updateOne({ schoolId, userId }, { $unset: { classTeacherOf: "" } });
    return NextResponse.json({ message: "Class teacher role removed" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to remove class teacher" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) { return PATCH(req, ctx); }
`);

// ─── teachers/dashboard ───────────────────────────────────────────────────
write("app/api/teachers/dashboard/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);

    const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
    if (!profile) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

    const allClassIds = new Set<string>();
    if (profile.classTeacherOf) allClassIds.add(profile.classTeacherOf.toString());
    for (const entry of profile.subjectsAndClasses || []) {
      for (const cid of entry.classIds || []) allClassIds.add(cid.toString());
    }

    const classIds = [...allClassIds].map((id) => new mongoose.Types.ObjectId(id));
    const classes = classIds.length ? await Class.find({ _id: { $in: classIds } }).lean() : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

    const myStudents = profile.classTeacherOf
      ? await Student.countDocuments({ schoolId, currentClassId: profile.classTeacherOf })
      : 0;

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const activeYear = activeTerm ? await AcademicYear.findById(activeTerm.academicYearId).lean() : null;

    return NextResponse.json({
      profile: {
        classTeacherOf: profile.classTeacherOf ? { _id: profile.classTeacherOf.toString(), ...(classMap.get(profile.classTeacherOf.toString()) || {}) } : null,
        subjectsAndClasses: (profile.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
          subjectId: { _id: e.subjectId.toString() },
          classIds: e.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString(), ...(classMap.get(id.toString()) || {}) })),
        })),
      },
      stats: {
        myStudents,
        activeTerm: activeTerm && activeYear ? \`\${(activeYear as {name?: string}).name} T\${activeTerm.termNumber}\` : "N/A",
        myClasses: allClassIds.size,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher dashboard" }, { status: 500 });
  }
}
`);

// ─── teachers/students ────────────────────────────────────────────────────
write("app/api/teachers/students/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Student from "@/app/models/Students";
import ParentWardLink from "@/app/models/ParentWardLink";
import User from "@/app/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);

    const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
    if (!profile || !profile.classTeacherOf) return NextResponse.json({ students: [] });

    const students = await Student.find({ schoolId, currentClassId: profile.classTeacherOf }).lean();
    const studentIds = students.map((s) => s._id);

    const wardLinks = studentIds.length ? await ParentWardLink.find({ schoolId, studentId: { $in: studentIds } }).lean() : [];
    const parentIds = [...new Set(wardLinks.map((w) => w.parentId))];
    const parents = parentIds.length ? await User.find({ _id: { $in: parentIds } }).select("_id fullName email").lean() : [];
    const parentMap = new Map(parents.map((p) => [p._id.toString(), p]));
    const parentByStudent = new Map<string, string>();
    for (const link of wardLinks) {
      if (link.isPrimary || !parentByStudent.has(link.studentId.toString())) {
        parentByStudent.set(link.studentId.toString(), link.parentId.toString());
      }
    }

    return NextResponse.json({
      students: students.map((s) => {
        const parentId = parentByStudent.get(s._id.toString());
        const parent = parentId ? parentMap.get(parentId) : null;
        return {
          _id: s._id.toString(),
          id: s._id.toString(),
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          gender: s.gender,
          parent: parent ? { id: parent._id.toString(), fullName: parent.fullName, email: parent.email } : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch students" }, { status: 500 });
  }
}
`);

// ─── teachers/assignments ─────────────────────────────────────────────────
write("app/api/teachers/assignments/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);

    const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
    return NextResponse.json({
      assignments: {
        classTeacherOf: profile?.classTeacherOf ? profile.classTeacherOf.toString() : null,
        subjectsAndClasses: (profile?.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
          subjectId: e.subjectId.toString(),
          classIds: e.classIds.map((id: mongoose.Types.ObjectId) => id.toString()),
        })),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const teacherId = String(body?.teacherId || "").trim();
    if (!teacherId) return NextResponse.json({ error: "teacherId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(teacherId);

    const update: Record<string, unknown> = {};
    if (body?.classTeacherOf !== undefined) update.classTeacherOf = body.classTeacherOf ? new mongoose.Types.ObjectId(body.classTeacherOf) : null;
    if (Array.isArray(body?.subjectsAndClasses)) {
      update.subjectsAndClasses = body.subjectsAndClasses.map((e: {subjectId: string; classIds: string[]}) => ({
        subjectId: new mongoose.Types.ObjectId(e.subjectId),
        classIds: (e.classIds || []).map((id: string) => new mongoose.Types.ObjectId(id)),
      }));
    }

    await TeacherProfile.findOneAndUpdate({ schoolId, userId }, { $set: update }, { upsert: true });
    return NextResponse.json({ message: "Assignments updated" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update assignments" }, { status: 500 });
  }
}
`);

// ─── teachers/rewards ─────────────────────────────────────────────────────
write("app/api/teachers/rewards/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherRewardWinners from "@/app/models/TeacherRewardWinners";
import TeacherActivity from "@/app/models/TeacherActivity";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

async function resolveTermId(schoolId: mongoose.Types.ObjectId, termIdQuery?: string) {
  if (termIdQuery) {
    const t = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termIdQuery) }).lean();
    return t ? t._id : null;
  }
  const t = await Term.findOne({ schoolId, isActive: true }).lean();
  return t ? t._id : null;
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const termId = await resolveTermId(schoolId, searchParams.get("termId") || undefined);
    if (!termId) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const winners = await TeacherRewardWinners.find({ schoolId, termId }).sort({ rank: 1 }).lean();
    const self = user.role === "TEACHER"
      ? winners.find((w) => w.teacherId.toString() === user.userId) || null
      : null;

    return NextResponse.json({ termId: termId.toString(), winners, finalized: winners.length > 0, self });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch rewards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const termId = await resolveTermId(schoolId, body?.termId || undefined);
    if (!termId) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const existing = await TeacherRewardWinners.find({ schoolId, termId }).lean();
    if (existing.length > 0 && !body?.forceRecompute) {
      return NextResponse.json({ error: "Winners already finalized for this term", hint: "Pass forceRecompute=true to overwrite" }, { status: 409 });
    }

    // Build leaderboard from TeacherActivity
    const activities = await TeacherActivity.find({ schoolId, termId }).lean();
    const pointsByTeacher = new Map<string, number>();
    for (const act of activities) {
      const tid = act.teacherId.toString();
      pointsByTeacher.set(tid, (pointsByTeacher.get(tid) || 0) + (act.points || 1));
    }

    const leaderboard = [...pointsByTeacher.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([teacherId, points], index) => ({ teacherId, points, rank: index + 1, breakdown: {} }));

    if (existing.length > 0) await TeacherRewardWinners.deleteMany({ schoolId, termId });

    const now = new Date();
    await TeacherRewardWinners.insertMany(
      leaderboard.map((item) => ({
        schoolId,
        termId,
        teacherId: new mongoose.Types.ObjectId(item.teacherId),
        rank: item.rank,
        points: item.points,
        breakdown: item.breakdown,
        finalizedBy: new mongoose.Types.ObjectId(admin.userId),
        note: body?.note ? String(body.note) : null,
      }))
    );

    return NextResponse.json({ message: "Top 5 rewards finalized for term", termId: termId.toString(), winners: leaderboard, giftedCount: leaderboard.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to finalize rewards" }, { status: 500 });
  }
}

export async function PATCH(req: Request) { return POST(req); }
export async function PUT(req: Request) { return POST(req); }
export async function DELETE() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
`);

// ─── teachers/leaderboard ─────────────────────────────────────────────────
write("app/api/teachers/leaderboard/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherRewardWinners from "@/app/models/TeacherRewardWinners";
import TeacherActivity from "@/app/models/TeacherActivity";
import Term from "@/app/models/Term";
import User from "@/app/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    let termId;
    const termIdQ = searchParams.get("termId");
    if (termIdQ) {
      const t = await Term.findOne({ schoolId, _id: new mongoose.Types.ObjectId(termIdQ) }).lean();
      termId = t?._id;
    } else {
      const t = await Term.findOne({ schoolId, isActive: true }).lean();
      termId = t?._id;
    }

    if (!termId) return NextResponse.json({ leaderboard: [] });

    const winners = await TeacherRewardWinners.find({ schoolId, termId }).sort({ rank: 1 }).lean();
    if (winners.length > 0) {
      const teacherIds = winners.map((w) => w.teacherId);
      const teachers = await User.find({ _id: { $in: teacherIds } }).select("_id fullName").lean();
      const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t.fullName]));
      return NextResponse.json({
        leaderboard: winners.map((w) => ({
          rank: w.rank,
          teacherId: w.teacherId.toString(),
          teacherName: teacherMap.get(w.teacherId.toString()) || "Unknown",
          points: w.points,
          breakdown: w.breakdown,
        })),
        termId: termId.toString(),
        finalized: true,
      });
    }

    // Live leaderboard from activities
    const activities = await TeacherActivity.find({ schoolId, termId }).lean();
    const pointsByTeacher = new Map<string, number>();
    for (const act of activities) {
      const tid = act.teacherId.toString();
      pointsByTeacher.set(tid, (pointsByTeacher.get(tid) || 0) + (act.points || 1));
    }

    const ranked = [...pointsByTeacher.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const teacherIds = ranked.map(([tid]) => new mongoose.Types.ObjectId(tid));
    const teachers = teacherIds.length ? await User.find({ _id: { $in: teacherIds } }).select("_id fullName").lean() : [];
    const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t.fullName]));

    return NextResponse.json({
      leaderboard: ranked.map(([tid, points], index) => ({
        rank: index + 1,
        teacherId: tid,
        teacherName: teacherMap.get(tid) || "Unknown",
        points,
        breakdown: {},
      })),
      termId: termId.toString(),
      finalized: false,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch leaderboard" }, { status: 500 });
  }
}
`);

console.log("\\n✅ Batch 3 done: teachers (create, list, [id], assign-subject, assign-class-teacher, remove-subject, remove-class-teacher, dashboard, students, assignments, rewards, leaderboard)");
