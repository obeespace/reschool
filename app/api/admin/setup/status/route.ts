import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import AcademicYear from "@/app/models/AcademicYear";
import Term from "@/app/models/Term";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const [academicYears, activeTerm, classes, subjects, admissionSettings] = await Promise.all([
      AcademicYear.countDocuments({ schoolId }),
      Term.findOne({ schoolId, isActive: true }).lean(),
      Class.countDocuments({ schoolId }),
      Subject.countDocuments({ schoolId }),
      AdmissionSettings.findOne({ schoolId }).lean(),
    ]);

    // Check if multiple distinct arms exist
    const distinctArms = classes > 0
      ? await Class.distinct("arm", { schoolId })
      : [];

    const status = {
      hasSession: academicYears > 0,
      hasCurrentTerm: Boolean(activeTerm),
      hasClasses: classes > 0,
      hasArms: distinctArms.length > 0,
      hasSubjects: subjects > 0,
      hasAdmissionSettings: Boolean(admissionSettings),
    };

    const isComplete = status.hasSession && status.hasCurrentTerm && status.hasClasses && status.hasSubjects && status.hasAdmissionSettings;

    // Return the step number of the first incomplete item (1-indexed)
    let nextStep = 7; // all done
    if (!status.hasSession) nextStep = 1;
    else if (!status.hasCurrentTerm) nextStep = 2;
    else if (!status.hasClasses) nextStep = 3;
    else if (!status.hasArms) nextStep = 4;
    else if (!status.hasSubjects) nextStep = 5;
    else if (!status.hasAdmissionSettings) nextStep = 6;

    return NextResponse.json({ isComplete, status, nextStep });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch setup status" }, { status: 500 });
  }
}

