import { Schema, model, models, Types } from "mongoose";

const StudentClassHistorySchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    academicYearId: { type: Types.ObjectId, ref: "AcademicYear", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true }, // ← FIXED: was "User"
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    session: { type: String, required: true },
    termAverages: [{ type: Number }], // 3 terms
    finalAverage: { type: Number, default: 0 },
    promoted: { type: Boolean, default: false },
    repeated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

StudentClassHistorySchema.index({ schoolId: 1, studentId: 1, academicYearId: 1 });
StudentClassHistorySchema.index({ schoolId: 1, academicYearId: 1 });

export default models.StudentClassHistory ||
  model("StudentClassHistory", StudentClassHistorySchema);
