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
    photoUrl: { type: String },

    // SS stream (set after JSS3 AI recommendation)
    track: { type: String, enum: ["SCIENCE", "ARTS", "COMMERCIAL"], required: false },

    // House system (for schools that run inter-house competitions)
    house: { type: String, required: false },

    isPrefect: { type: Boolean, default: false },
    prefectTitle: { type: String, required: false },

    // Medical / health record
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], required: false },
    genotype: { type: String, enum: ["AA", "AS", "SS", "AC", "SC"], required: false },
    allergies: [{ type: String }],
    medicalConditions: [{ type: String }],
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    
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
