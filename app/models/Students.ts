import { Schema, model, models, Types } from "mongoose";

const StudentSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    fullName: { type: String, required: true },
    admissionNumber: { type: String, required: true },
    dateOfBirth: { type: Date, required: false },
    gender: { type: String, enum: ["Male", "Female"], required: false },
    parentId: { type: Types.ObjectId, ref: "User", required: false },
    currentClassId: { type: Types.ObjectId, ref: "Class", required: true },
    isPrefect: { type: Boolean, default: false },
    prefectTitle: { type: String, required: false },
    
    // Suspension history (array for multiple suspensions)
    suspensionHistory: [
      {
        suspendedDate: Date,
        suspendedUntilDate: Date,
        reason: String,
        suspendedBy: { type: Types.ObjectId, ref: "User" }
      }
    ],
    
    // Withdrawal record
    withdrawalRecord: {
      withdrawnDate: Date,
      reason: String,
      academicStanding: String,
      withdrawnBy: { type: Types.ObjectId, ref: "User" }
    }
  },
  { timestamps: true }
);

StudentSchema.index({ schoolId: 1, admissionNumber: 1 });
StudentSchema.index({ currentClassId: 1 });
StudentSchema.index({ parentId: 1 });

export default models.Student || model("Student", StudentSchema);
