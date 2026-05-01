import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import School from "@/app/models/School";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const [school, activeTerm, teachers, parents, students, classes, subjects] = await Promise.all([
      School.findById(schoolId).lean(),
      Term.findOne({ schoolId, isActive: true }).lean(),
      User.countDocuments({ schoolId, role: "TEACHER" }),
      User.countDocuments({ schoolId, role: "PARENT" }),
      Student.countDocuments({ schoolId }),
      Class.countDocuments({ schoolId }),
      Subject.countDocuments({ schoolId }),
    ]);

    const activeYear = activeTerm ? await AcademicYear.findById(activeTerm.academicYearId).lean() : null;

    return NextResponse.json({
      schoolName: (school as {name?: string} | null)?.name || "School",
      stats: { teachers, students, parents, classes, subjects },
      activeTerm: activeTerm
        ? {
            academicYear: activeYear ? (activeYear as {name?: string}).name : "N/A",
            term: activeTerm.termNumber,
            isPaid: activeTerm.isPaid,
            isClosed: activeTerm.isClosed,
            startDate: activeTerm.startDate,
            endDate: activeTerm.endDate,
          }
        : null,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch stats" }, { status: 500 });
  }
}
