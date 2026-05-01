import { Schema, model, models, Types } from "mongoose";

export interface IStudentLifecycleRecord {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  admissionDate: Date;
  admissionClass: string;
  currentClass: string;
  currentStatus: "ACTIVE" | "SUSPENDED" | "WITHDRAWN" | "GRADUATED" | "DEFERRED";

  // Milestones
  milestones: Array<{
    academicYear: string;
    term: number;
    classLevel: string;
    classArm: string;
    termAverage: number;
    promoted: boolean;
    action: "PROMOTED" | "REPEATED" | "GRADUATED" | "WITHDRAWN";
  }>;

  // Graduation
  graduationDate?: Date;
  certificateId?: string;
  certificationStatus?: "ELIGIBLE" | "PENDING" | "ISSUED" | "REPRINTING";

  // Behavioral
  suspensionCount: number;
  withdrawalReason?: string;

  // Aggregates
  overallPerformance: {
    bestSubject?: string;
    worstSubject?: string;
    consistencyScore: number; // 0-100
  };
}

const StudentLifecycleRecordSchema = new Schema<IStudentLifecycleRecord>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    admissionDate: { type: Date, required: true },
    admissionClass: { type: String, required: true },
    currentClass: { type: String, required: true },
    currentStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "WITHDRAWN", "GRADUATED", "DEFERRED"],
      default: "ACTIVE"
    },

    milestones: [
      {
        academicYear: String,
        term: Number,
        classLevel: String,
        classArm: String,
        termAverage: Number,
        promoted: Boolean,
        action: {
          type: String,
          enum: ["PROMOTED", "REPEATED", "GRADUATED", "WITHDRAWN"]
        }
      }
    ],

    graduationDate: Date,
    certificateId: String,
    certificationStatus: {
      type: String,
      enum: ["ELIGIBLE", "PENDING", "ISSUED", "REPRINTING"],
      default: "PENDING"
    },

    suspensionCount: { type: Number, default: 0 },
    withdrawalReason: String,

    overallPerformance: {
      bestSubject: String,
      worstSubject: String,
      consistencyScore: { type: Number, default: 0, min: 0, max: 100 }
    }
  },
  { timestamps: true }
);

// Indexes
StudentLifecycleRecordSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
StudentLifecycleRecordSchema.index({ schoolId: 1, currentStatus: 1 });
StudentLifecycleRecordSchema.index({ schoolId: 1, graduationDate: 1 });

export default models.StudentLifecycleRecord ||
  model("StudentLifecycleRecord", StudentLifecycleRecordSchema);
