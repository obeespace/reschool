import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const [teachers, classes, subjects, academicYears] = await Promise.all([
      User.countDocuments({ schoolId, role: "TEACHER" }),
      Class.countDocuments({ schoolId }),
      Subject.countDocuments({ schoolId }),
      AcademicYear.countDocuments({ schoolId }),
    ]);

    const setupComplete = teachers > 0 && classes > 0 && subjects > 0 && academicYears > 0;
    return NextResponse.json({
      setupComplete,
      steps: {
        hasTeachers: teachers > 0,
        hasClasses: classes > 0,
        hasSubjects: subjects > 0,
        hasAcademicYears: academicYears > 0,
      },
      counts: { teachers, classes, subjects, academicYears },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch setup status" }, { status: 500 });
  }
}
