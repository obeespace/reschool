import connectDB from "@/app/utils/db";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import School from "@/app/models/School";
import User from "@/app/models/User";
import Student from "@/app/models/Students";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    // Only superadmins (ADMIN role with no schoolId) can access this endpoint
    if (!user || user.role !== "ADMIN" || user.schoolId) {
      return NextResponse.json({ error: "Unauthorized - Superadmin access only" }, { status: 401 });
    }

    // Fetch all schools with counts
    const schools = await School.find().lean();
    
    const schoolsWithStats = await Promise.all(
      schools.map(async (school: any) => {
        const teachers = await User.countDocuments({
          schoolId: school._id,
          role: "TEACHER",
        });
        const parents = await User.countDocuments({
          schoolId: school._id,
          role: "PARENT",
        });
        const students = await Student.countDocuments({
          schoolId: school._id,
        });

        return {
          id: school._id,
          name: school.name,
          email: school.email,
          phone: school.phone,
          state: school.state,
          teachers,
          parents,
          students,
          totalUsers: teachers + parents,
          createdAt: school.createdAt,
        };
      })
    );

    // Calculate global stats
    const totalSchools = schools.length;
    const totalTeachers = await User.countDocuments({ role: "TEACHER" });
    const totalParents = await User.countDocuments({ role: "PARENT" });
    const totalStudents = await Student.countDocuments({});
    const totalAdmins = await User.countDocuments({ role: "ADMIN" });

    return NextResponse.json({
      schools: schoolsWithStats,
      globalStats: {
        totalSchools,
        totalTeachers,
        totalParents,
        totalStudents,
        totalAdmins,
        totalUsers: totalTeachers + totalParents + totalAdmins,
      },
    });
  } catch (error: any) {
    console.error("Error fetching super admin analytics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
