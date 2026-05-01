import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import "@/app/models/Subject";
import { verifyToken } from "@/app/utils/auth";
import { allowRoles } from "@/app/utils/permissions";
import { NextResponse } from "next/server";

// Update teacher assignments (class teacher role and subjects/classes)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");
    
    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { 
      teacherUserId,
      classTeacherOf, // Optional: classId they are class teacher of
      subjectsAndClasses // Array of { subjectId, classIds: [] }
    } = await req.json();

    if (!teacherUserId) {
      return NextResponse.json(
        { error: "Teacher user ID is required" },
        { status: 400 }
      );
    }

    // Find existing teacher profile
    const profile = await TeacherProfile.findOne({ userId: teacherUserId });

    if (!profile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // If classTeacherOf changed, update the class records
    if (classTeacherOf !== undefined) {
      // Remove from old class if any
      if (profile.classTeacherOf) {
        await Class.findByIdAndUpdate(profile.classTeacherOf, {
          $set: { classTeacherId: null }
        });
      }

      // Assign to new class if provided
      if (classTeacherOf) {
        await Class.findOneAndUpdate(
          { _id: classTeacherOf, schoolId: user!.schoolId },
          { $set: { classTeacherId: teacherUserId } }
        );
      }

      profile.classTeacherOf = classTeacherOf || null;
    }

    // Update subjects and classes
    if (subjectsAndClasses !== undefined) {
      profile.subjectsAndClasses = subjectsAndClasses;
    }

    await profile.save();

    return NextResponse.json({
      message: "Teacher assignments updated successfully",
      profile
    });
  } catch (error: any) {
    console.error("Update teacher assignments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update teacher assignments" },
      { status: 500 }
    );
  }
}

// Get specific teacher profile (for admin)
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!allowRoles(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const teacherUserId = searchParams.get("teacherUserId");

    if (!teacherUserId) {
      return NextResponse.json(
        { error: "Teacher user ID is required" },
        { status: 400 }
      );
    }

    const profile = await TeacherProfile.findOne({ userId: teacherUserId })
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
