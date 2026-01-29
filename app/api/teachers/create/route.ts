import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");
    
    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { 
      fullName, 
      email, 
      password, 
      classTeacherOf, // Optional: classId they are class teacher of
      subjectsAndClasses // Array of { subjectId, classIds: [] }
    } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    // Create the teacher user account
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      passwordHash,
      role: "TEACHER",
      schoolId: user!.schoolId,
      isActive: true
    });

    // If assigned as class teacher, update the class
    if (classTeacherOf) {
      await Class.findOneAndUpdate(
        { _id: classTeacherOf, schoolId: user!.schoolId },
        { $set: { classTeacherId: newUser._id } }
      );
    }

    // Create teacher profile with subjects and classes
    const teacherProfile = await TeacherProfile.create({
      schoolId: user!.schoolId,
      userId: newUser._id,
      classTeacherOf: classTeacherOf || null,
      subjectsAndClasses: subjectsAndClasses || []
    });

    return NextResponse.json({
      userId: newUser._id.toString(),
      teacherProfileId: teacherProfile._id.toString(),
      message: "Teacher created successfully"
    });
  } catch (error: any) {
    console.error("Teacher creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create teacher" },
      { status: 500 }
    );
  }
}

// Get teacher profile
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profile = await TeacherProfile.findOne({ userId: user.userId })
      .populate("classTeacherOf", "level arm")
      .populate("subjectsAndClasses.subjectId", "name code")
      .populate("subjectsAndClasses.classIds", "level arm");

    if (!profile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("Fetch teacher profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}
