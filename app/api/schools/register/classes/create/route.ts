import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import CurriculumSuggestion from "@/app/models/CurriculumSuggestion";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const user = verifyToken(token || "");
  if (!allowRoles(user, ["ADMIN"])) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { level, arm } = await req.json();
  const newClass = await Class.create({ level, arm, schoolId: user!.schoolId });

  await CurriculumSuggestion.create({
    schoolId: user!.schoolId,
    classId: newClass._id,
    suggestions: [
      `Introduce AI literacy for ${level}${arm}`,
      `Replace outdated topics with modern curriculum content`,
      `Add project-based learning and digital tools`
    ],
    generatedAt: new Date()
  });

  return NextResponse.json({ classId: newClass._id.toString() });
}
