import { Schema, model, models, Types } from "mongoose";

const DailyMarkSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    subjectId: { type: Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    teacherId: { type: Types.ObjectId, ref: "User", required: true },
    academicYearId: { type: Types.ObjectId, ref: "AcademicYear", required: true },
    termId: { type: Types.ObjectId, ref: "Term", required: true }, // ← NEW: Term awareness
    
    assessmentType: {
      type: String,
      enum: ["CLASSWORK", "HOMEWORK", "EVALUATION", "EXAM"],
      required: true
    },
    
    score: { type: Number, required: true, min: 0, max: 100 },
    maxScore: { type: Number, default: 10 },
    weightage: { type: Number, default: 10 }, // ← NEW: For weighted calculation
    feedbackNotes: { type: String },
    recordedDate: { type: Date, default: Date.now },
    
    // Audit trail
    recordedBy: { type: Types.ObjectId, ref: "User", required: true },
    lastModifiedBy: { type: Types.ObjectId, ref: "User" },
    modificationHistory: [
      {
        modifiedDate: { type: Date, default: Date.now },
        oldScore: Number,
        newScore: Number,
        modifiedBy: { type: Types.ObjectId, ref: "User" },
        reason: String,
        ipAddress: String
      }
    ]
  },
  { timestamps: true }
);

// Index for efficient queries
DailyMarkSchema.index({ studentId: 1, subjectId: 1, termId: 1 });
DailyMarkSchema.index({ classId: 1, termId: 1 });
DailyMarkSchema.index({ recordedDate: 1 });
DailyMarkSchema.index({ schoolId: 1, termId: 1, studentId: 1 });

export default models.DailyMark || model("DailyMark", DailyMarkSchema);
