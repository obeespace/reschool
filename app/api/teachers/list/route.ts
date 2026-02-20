import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import "@/app/models/Class";
import "@/app/models/Subject";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

// List all teachers for the school
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const teachers = await User.find({
      schoolId: user!.schoolId,
      role: "TEACHER",
      isActive: true
    }).select("fullName email");

    // Get profiles for all teachers
    const teacherIds = teachers.map(t => t._id);
    const profiles = await TeacherProfile.find({
      userId: { $in: teacherIds }
    })
      .populate("classTeacherOf", "level arm")
      .populate("subjectsAndClasses.subjectId", "name code")
      .populate("subjectsAndClasses.classIds", "level arm");

    // Combine teacher info with profiles
    const teachersWithProfiles = teachers.map(teacher => {
      const profile = profiles.find(p => p.userId.toString() === teacher._id.toString());
      return {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        profile: profile || null
      };
    });

    return NextResponse.json({ teachers: teachersWithProfiles });
  } catch (error: any) {
    console.error("List teachers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list teachers" },
      { status: 500 }
    );
  }
}
