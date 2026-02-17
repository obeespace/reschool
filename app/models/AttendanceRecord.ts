import { Schema, model, models, Types } from "mongoose";

export interface IAttendanceRecord {
  schoolId: Types.ObjectId;
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  termId: Types.ObjectId;
  attendanceDate: Date;

  records: Array<{
    studentId: Types.ObjectId;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    excuseReason?: string;
    markedBy: Types.ObjectId;
    markedTime: Date;
  }>;

  markedDate: Date;
  total: number;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    attendanceDate: { type: Date, required: true },

    records: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
        status: {
          type: String,
          enum: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
          required: true
        },
        excuseReason: String,
        markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        markedTime: { type: Date, default: Date.now }
      }
    ],

    markedDate: { type: Date, default: Date.now },
    total: { type: Number, default: 0 }
  },
  { timestamps: true }
);

AttendanceRecordSchema.index({ schoolId: 1, classId: 1, attendanceDate: 1 }, { unique: true });
AttendanceRecordSchema.index({ schoolId: 1, termId: 1 });
AttendanceRecordSchema.index({ "records.studentId": 1, termId: 1 });

export default models.AttendanceRecord ||
  model("AttendanceRecord", AttendanceRecordSchema);
