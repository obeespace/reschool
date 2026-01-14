import connectDB from "@/app/utils/db";
import School from "@/app/models/School";
import User from "@/app/models/User";
import Class from "@/app/models/Class";
import CurriculumSuggestion from "@/app/models/CurriculumSuggestion";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  return NextResponse.json({
    schools: await School.countDocuments(),
    users: await User.countDocuments(),
    classes: await Class.countDocuments(),
    curriculumSuggestions: await CurriculumSuggestion.countDocuments(),
    status: "Week 1 SaaS Progress OK"
  });
}
