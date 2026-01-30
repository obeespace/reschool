import { Schema, model, models, Types } from "mongoose";

const DailyMarkSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    subjectId: { type: Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    teacherId: { type: Types.ObjectId, ref: "User", required: true },
    academicYearId: { type: Types.ObjectId, ref: "AcademicYear", required: true },
    type: { 
      type: String, 
      enum: ["classwork", "homework", "test", "extracurricular"],
      required: true 
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    maxScore: { type: Number, default: 10 },
    notes: { type: String },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index for efficient queries
DailyMarkSchema.index({ studentId: 1, subjectId: 1, academicYearId: 1 });
DailyMarkSchema.index({ classId: 1, academicYearId: 1 });
DailyMarkSchema.index({ date: 1 });

export default models.DailyMark || model("DailyMark", DailyMarkSchema);
