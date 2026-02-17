import { Schema, model, models, Types } from "mongoose";

export interface ITeacherRemark {
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  termId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;

  type: "SUBJECT" | "CLASS_TEACHER";
  subjectId?: Types.ObjectId;

  academicPerformance: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";
  classParticipation: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";
  attitudeToDuties: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";

  customRemark: string;

  remarkedBy: Types.ObjectId;
  remarkedDate: Date;

  promotionRecommendation?: "PROMOTE" | "DEFER" | "REPEAT" | "PENDING";
}

const TeacherRemarkSchema = new Schema<ITeacherRemark>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },

    type: {
      type: String,
      enum: ["SUBJECT", "CLASS_TEACHER"],
      required: true
    },
    subjectId: Schema.Types.ObjectId,

    academicPerformance: {
      type: String,
      enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"],
      required: true
    },
    classParticipation: {
      type: String,
      enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"],
      required: true
    },
    attitudeToDuties: {
      type: String,
      enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"],
      required: true
    },

    customRemark: { type: String, maxlength: 500 },

    remarkedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    remarkedDate: { type: Date, default: Date.now },

    promotionRecommendation: {
      type: String,
      enum: ["PROMOTE", "DEFER", "REPEAT", "PENDING"]
    }
  },
  { timestamps: true }
);

TeacherRemarkSchema.index({ schoolId: 1, studentId: 1, termId: 1, type: 1 });
TeacherRemarkSchema.index({ schoolId: 1, termId: 1, remarkedBy: 1 });

export default models.TeacherRemark || model("TeacherRemark", TeacherRemarkSchema);
