import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import mongoose from "mongoose";

// GET /api/export/waec-registration?termId=
// Returns SS3 students with their subjects — ready for WAEC registration
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const termId = searchParams.get("termId");

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    // Find all SS3 classes
    const ss3Classes = await Class.find({ schoolId, level: { $in: ["SS3", "SSS3"] } }).lean();
    if (!ss3Classes.length) {
      return NextResponse.json({ error: "No SS3 classes found" }, { status: 404 });
    }

    const classIds = ss3Classes.map((c) => c._id);
    const students = await Student.find({ schoolId, currentClassId: { $in: classIds } }).lean();

    // Build class map for display
    const classMap = new Map(ss3Classes.map((c) => [c._id.toString(), `${(c as { level: string }).level} ${(c as { arm: string }).arm}`]));

    // Get subjects for each class
    const subjectIds = [...new Set(ss3Classes.flatMap((c) => (c.subjectIds || []).map((id: mongoose.Types.ObjectId) => id.toString())))];
    const subjects = subjectIds.length
      ? await Subject.find({ _id: { $in: subjectIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
      : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s as { name: string; waecCode?: string }]));

    // Build class → subjects map
    const classSubjects = new Map<string, { subjectId: string; name: string; waecCode?: string }[]>();
    for (const cls of ss3Classes) {
      const subs = (cls.subjectIds || []).map((id: mongoose.Types.ObjectId) => {
        const sub = subjectMap.get(id.toString());
        return { subjectId: id.toString(), name: sub?.name ?? "Unknown", waecCode: sub?.waecCode };
      });
      classSubjects.set(cls._id.toString(), subs);
    }

    const rows = students.map((s) => {
      const classId = (s as { currentClassId: mongoose.Types.ObjectId }).currentClassId?.toString() ?? "";
      return {
        admissionNumber: (s as { admissionNumber: string }).admissionNumber,
        fullName: (s as { fullName: string }).fullName,
        gender: (s as { gender?: string }).gender ?? "",
        dateOfBirth: (s as { dateOfBirth?: Date }).dateOfBirth?.toISOString().split("T")[0] ?? "",
        track: (s as { track?: string }).track ?? "",
        className: classMap.get(classId) ?? "",
        subjects: classSubjects.get(classId) ?? [],
      };
    });

    // Let caller choose format via Accept header
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/csv")) {
      // CSV export
      const header = "Admission No,Full Name,Gender,DOB,Track,Class,Subjects";
      const lines = rows.map((r) => {
        const subjectList = r.subjects.map((s) => `${s.name}(${s.waecCode ?? "N/A"})`).join("; ");
        return `${r.admissionNumber},${r.fullName},${r.gender},${r.dateOfBirth},${r.track},${r.className},"${subjectList}"`;
      });
      const csv = [header, ...lines].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=\"waec_registration.csv\"",
        },
      });
    }

    return NextResponse.json({ count: rows.length, students: rows });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
