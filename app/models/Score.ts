import { Schema, model, models, Types } from "mongoose";

const ScoreSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    academicYearId: { type: Types.ObjectId, ref: "AcademicYear", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: Types.ObjectId, ref: "Subject", required: true },
    term: { type: Number, enum: [1, 2, 3], required: true },
    classwork: { type: Number, default: 0, min: 0, max: 10 },  // CA component 1 (10 marks)
    homework: { type: Number, default: 0, min: 0, max: 10 },   // CA component 2 (10 marks)
    test: { type: Number, default: 0, min: 0, max: 20 },       // CA component 3 (20 marks) — total CA = 40
    exam: { type: Number, default: 0, min: 0, max: 60 },       // Terminal exam (60 marks)
    total: { type: Number, default: 0 },                        // Max = 100
    grade: { type: String, default: "F9" },                    // WAEC grade: A1, B2, B3, C4, C5, C6, D7, E8, F9
    teacherId: { type: Types.ObjectId, ref: "User", required: true },
    
    // Audit trail
    modificationHistory: [
      {
        modifiedDate: { type: Date, default: Date.now },
        field: String,
        oldValue: Number,
        newValue: Number,
        modifiedBy: { type: Types.ObjectId, ref: "User" },
        reason: String
      }
    ]
  },
  { timestamps: true }
);

// Calculate total and WAEC grade before saving
ScoreSchema.pre("save", function() {
  this.total = (this.classwork || 0) + (this.homework || 0) + 
                (this.test || 0) + (this.exam || 0);
  const t = this.total;
  if (t >= 75) this.grade = "A1";
  else if (t >= 70) this.grade = "B2";
  else if (t >= 65) this.grade = "B3";
  else if (t >= 60) this.grade = "C4";
  else if (t >= 55) this.grade = "C5";
  else if (t >= 50) this.grade = "C6";
  else if (t >= 45) this.grade = "D7";
  else if (t >= 40) this.grade = "E8";
  else this.grade = "F9";
});

// Ensure unique score per student, subject, class, term, and academic year
ScoreSchema.index({ 
  studentId: 1, 
  subjectId: 1, 
  classId: 1, 
  term: 1, 
  academicYearId: 1 
}, { unique: true });

ScoreSchema.index({ schoolId: 1, term: 1, studentId: 1 });

export default models.Score || model("Score", ScoreSchema);
