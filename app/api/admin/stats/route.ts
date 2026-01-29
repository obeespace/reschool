import connectDB from "@/app/utils/db";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";
import School from "@/app/models/School";
import User from "@/app/models/User";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolId = user.schoolId;

    // Fetch school info
    const school = await School.findById(schoolId);

    // Count users by role
    const teachers = await User.countDocuments({ schoolId, role: "TEACHER" });
    const parents = await User.countDocuments({ schoolId, role: "PARENT" });
    const students = await Student.countDocuments({ schoolId });
    const classes = await Class.countDocuments({ schoolId });
    const subjects = await Subject.countDocuments({ schoolId });

    return NextResponse.json({
      schoolName: school?.name || "School",
      stats: {
        teachers,
        students,
        parents,
        classes,
        subjects,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
