import { Schema, model, models, Types } from "mongoose";

export interface IReportCard {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  termId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  className: string;
  term: number;
  year: number;

  subjectScores: Array<{
    subjectId: Types.ObjectId;
    subjectName: string;
    classwork: number;
    homework: number;
    evaluation: number;
    exam: number;
    total: number;
    grade: string;
    teacherRemark: string;
    subjectTeacherId: Types.ObjectId;
  }>;

  totalScore: number;
  averageScore: number;
  classRanking: number;
  classSize: number;

  overallRemark: string;
  attendancePercentage: number;
  comportment: {
    punctuality: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";
    honesty: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";
    obedience: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";
  };

  promotionStatus: "PROMOTED" | "DEFERRED" | "REPEATED";
  repeatReason?: string;

  generatedDate: Date;
  approvedBy?: Types.ObjectId;
  printCount: number;
  printHistory: Array<{
    printDate: Date;
    printedBy: Types.ObjectId;
  }>;
}

const ReportCardSchema = new Schema<IReportCard>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    className: { type: String, required: true },
    term: { type: Number, required: true },
    year: { type: Number, required: true },

    subjectScores: [
      {
        subjectId: Schema.Types.ObjectId,
        subjectName: String,
        classwork: Number,
        homework: Number,
        evaluation: Number,
        exam: Number,
        total: Number,
        grade: String,
        teacherRemark: String,
        subjectTeacherId: Schema.Types.ObjectId
      }
    ],

    totalScore: Number,
    averageScore: Number,
    classRanking: Number,
    classSize: Number,

    overallRemark: String,
    attendancePercentage: { type: Number, min: 0, max: 100 },
    comportment: {
      punctuality: {
        type: String,
        enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"]
      },
      honesty: {
        type: String,
        enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"]
      },
      obedience: {
        type: String,
        enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR"]
      }
    },

    promotionStatus: {
      type: String,
      enum: ["PROMOTED", "DEFERRED", "REPEATED"]
    },
    repeatReason: String,

    generatedDate: { type: Date, default: Date.now },
    approvedBy: Schema.Types.ObjectId,
    printCount: { type: Number, default: 0 },
    printHistory: [
      {
        printDate: Date,
        printedBy: Schema.Types.ObjectId
      }
    ]
  },
  { timestamps: true }
);

ReportCardSchema.index({ schoolId: 1, studentId: 1, termId: 1 }, { unique: true });
ReportCardSchema.index({ schoolId: 1, termId: 1 });
ReportCardSchema.index({ schoolId: 1, approvedBy: 1 });

export default models.ReportCard || model("ReportCard", ReportCardSchema);
