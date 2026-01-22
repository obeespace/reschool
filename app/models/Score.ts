import { Schema, model, models, Types } from "mongoose";

const ScoreSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    academicYearId: { type: Types.ObjectId, ref: "AcademicYear", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: Types.ObjectId, ref: "Subject", required: true },
    term: { type: Number, enum: [1, 2, 3], required: true },
    classwork: { type: Number, default: 0, min: 0, max: 10 },
    homework: { type: Number, default: 0, min: 0, max: 10 },
    extracurricular: { type: Number, default: 0, min: 0, max: 10 },
    test: { type: Number, default: 0, min: 0, max: 30 },
    exam: { type: Number, default: 0, min: 0, max: 60 },
    total: { type: Number, default: 0 },
    teacherId: { type: Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

// Calculate total before saving
ScoreSchema.pre("save", function(next) {
  this.total = (this.classwork || 0) + (this.homework || 0) + 
                (this.extracurricular || 0) + (this.test || 0) + (this.exam || 0);
  next();
});

// Ensure unique score per student, subject, class, term, and academic year
ScoreSchema.index({ 
  studentId: 1, 
  subjectId: 1, 
  classId: 1, 
  term: 1, 
  academicYearId: 1 
}, { unique: true });

export default models.Score || model("Score", ScoreSchema);
