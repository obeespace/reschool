import connectDB from "@/app/utils/db";
import AttendanceRecord from "@/app/models/AttendanceRecord";
import Student from "@/app/models/Students";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

// Teacher: Mark daily attendance
export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { classId, termId, academicYearId, attendanceDate, records } =
      await req.json();

    if (!classId || !termId || !attendanceDate || !records || records.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if already marked for this date
    const existingRecord = await AttendanceRecord.findOne({
      classId,
      attendanceDate: new Date(attendanceDate),
      schoolId: user.schoolId
    });

    if (existingRecord) {
      return NextResponse.json(
        { error: "Attendance already marked for this date" },
        { status: 400 }
      );
    }

    // Create attendance record
    const attendanceRecord = await AttendanceRecord.create({
      schoolId: user.schoolId,
      classId,
      academicYearId,
      termId,
      attendanceDate: new Date(attendanceDate),
      records: records.map((r: any) => ({
        studentId: r.studentId,
        status: r.status,
        excuseReason: r.excuseReason,
        markedBy: user.userId,
        markedTime: new Date()
      })),
      markedDate: new Date(),
      total: records.length
    });

    return NextResponse.json({
      message: "Attendance marked successfully",
      attendanceRecordId: attendanceRecord._id.toString()
    });
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

// Get attendance for a student in a term
export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId || !termId) {
      return NextResponse.json(
        { error: "studentId and termId required" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await Student.findOne({
      _id: studentId,
      schoolId: user.schoolId
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Access control for parents
    if (user.role === "PARENT" && student.parentId?.toString() !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all attendance records for student in term
    const records = await AttendanceRecord.find({
      schoolId: user.schoolId,
      termId,
      "records.studentId": studentId
    }).sort({ attendanceDate: -1 });

    // Calculate summary
    let present = 0,
      absent = 0,
      late = 0,
      excused = 0;
    records.forEach((rec) => {
      const studentRec = rec.records.find(
        (r: any) => r.studentId.toString() === studentId
      );
      if (studentRec) {
        switch (studentRec.status) {
          case "PRESENT":
            present++;
            break;
          case "ABSENT":
            absent++;
            break;
          case "LATE":
            late++;
            break;
          case "EXCUSED":
            excused++;
            break;
        }
      }
    });

    const totalDays = present + absent + late + excused;
    const attendancePercentage = totalDays > 0 ? ((present + late) / totalDays) * 100 : 0;

    return NextResponse.json({
      summary: {
        present,
        absent,
        late,
        excused,
        totalDays,
        attendancePercentage: Math.round(attendancePercentage * 10) / 10
      },
      records: records.map((rec) => ({
        date: rec.attendanceDate,
        status: rec.records.find((r: any) => r.studentId.toString() === studentId)?.status,
        excuseReason: rec.records.find((r: any) => r.studentId.toString() === studentId)
          ?.excuseReason
      }))
    });
  } catch (error: any) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}
