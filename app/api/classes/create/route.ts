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

  // Check if class already exists
  const existingClass = await Class.findOne({
    schoolId: user!.schoolId,
    level,
    arm
  });

  if (existingClass) {
    return NextResponse.json({ 
      error: `Class ${level} ${arm} already exists` 
    }, { status: 400 });
  }

  const name = `${level} ${arm}`;
  const newClass = await Class.create({ 
    level, 
    arm, 
    name,
    schoolId: user!.schoolId 
  });

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

  return NextResponse.json({ 
    success: true,
    classId: newClass._id.toString(),
    className: name
  });
}
