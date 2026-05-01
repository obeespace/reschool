import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import Class from "@/app/models/Class";
import Students from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Attendance Dashboard API
 * Get class/term attendance summary with per-student breakdown
 * Access: ADMIN, TEACHER (own class)
 */

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const termId = searchParams.get("termId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!classId || !termId) {
      return NextResponse.json(
        { error: "classId and termId are required" },
        { status: 400 }
      );
    }

    // Access control: teacher can only view own class
    if (user.role === "TEACHER") {
      const teacherClass = await Class.findOne({
        _id: classId,
        classTutorId: user.id,
        schoolId: user.schoolId
      });

      if (!teacherClass) {
        return NextResponse.json(
          { error: "Cannot access this class" },
          { status: 403 }
        );
      }
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Fetch attendance records for this class/term
    const attendanceRecords = await AttendanceRecord.find({
      schoolId: user.schoolId,
      classId,
      termId,
      ...(Object.keys(dateFilter).length && { attendanceDate: dateFilter })
    })
      .sort({ attendanceDate: -1 })
      .lean();

    // Get all students in this class
    const students = await Students.find({
      currentClass: classId,
      schoolId: user.schoolId
    }).select("_id fullName studentId");

    // Calculate per-student attendance
    const studentAttendance: Record<
      string,
      {
        studentId: string;
        studentName: string;
        present: number;
        absent: number;
        late: number;
        excused: number;
        attendancePercentage: number;
        status: string; // EXCELLENT | GOOD | WARNING | CRITICAL
      }
    > = {};

    students.forEach((student) => {
      studentAttendance[student._id.toString()] = {
        studentId: student.studentId,
        studentName: student.fullName,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendancePercentage: 0,
        status: "EXCELLENT"
      };
    });

    // Process attendance records
    attendanceRecords.forEach((record: any) => {
      record.records.forEach((r: any) => {
        const sid = r.studentId.toString();
        if (studentAttendance[sid]) {
          switch (r.status) {
            case "PRESENT":
              studentAttendance[sid].present++;
              break;
            case "ABSENT":
              studentAttendance[sid].absent++;
              break;
            case "LATE":
              studentAttendance[sid].late++;
              break;
            case "EXCUSED":
              studentAttendance[sid].excused++;
              break;
          }
        }
      });
    });

    // Calculate percentages and status
    const studentAttendanceArray = Object.values(studentAttendance);
    studentAttendanceArray.forEach((att) => {
      const totalDays = att.present + att.absent + att.late + att.excused;
      if (totalDays > 0) {
        att.attendancePercentage = Math.round(
          ((att.present + att.late) / totalDays) * 100
        );

        if (att.attendancePercentage >= 90) att.status = "EXCELLENT";
        else if (att.attendancePercentage >= 75) att.status = "GOOD";
        else if (att.attendancePercentage >= 60) att.status = "WARNING";
        else att.status = "CRITICAL";
      }
    });

    // Sort by attendance percentage (ascending - critical first)
    studentAttendanceArray.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    // Calculate class summary
    const classStats = {
      totalStudents: students.length,
      averageAttendance: Math.round(
        studentAttendanceArray.reduce((sum, s) => sum + s.attendancePercentage, 0) /
          (studentAttendanceArray.length || 1)
      ),
      criticalCount: studentAttendanceArray.filter((s) => s.status === "CRITICAL").length,
      warningCount: studentAttendanceArray.filter((s) => s.status === "WARNING").length,
      excellentCount: studentAttendanceArray.filter((s) => s.status === "EXCELLENT").length
    };

    return NextResponse.json({
      class: classId,
      term: termId,
      dateRange: {
        from: startDate || "All",
        to: endDate || "Today"
      },
      classStats,
      studentAttendance: studentAttendanceArray
    });
  } catch (error: any) {
    console.error("Attendance dashboard error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance dashboard" },
      { status: 500 }
    );
  }
}
