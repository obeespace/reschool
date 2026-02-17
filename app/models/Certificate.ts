import { Schema, model, models, Types } from "mongoose";

export interface ICertificate {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  studentName: string;
  studentAdmissionNumber: string;
  admissionYear: number;
  graduationYear: number;
  classLevel: string;

  certificateNumber: string;
  issuedDate: Date;
  signatureApprovalStatus: "PENDING" | "APPROVED" | "SIGNED";
  signedBy?: {
    principalId: Types.ObjectId;
    principalName: string;
    signatureDate: Date;
  };

  reprintCount: number;
  reprintHistory: Array<{
    reprintDate: Date;
    reason: string;
  }>;

  digitalHash?: string;
  qrCode?: string;
  isVerifiable: boolean;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    studentAdmissionNumber: { type: String, required: true },
    admissionYear: { type: Number, required: true },
    graduationYear: { type: Number, required: true },
    classLevel: { type: String, required: true },

    certificateNumber: { type: String, required: true, unique: true },
    issuedDate: Date,
    signatureApprovalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "SIGNED"],
      default: "PENDING"
    },
    signedBy: {
      principalId: Schema.Types.ObjectId,
      principalName: String,
      signatureDate: Date
    },

    reprintCount: { type: Number, default: 0 },
    reprintHistory: [
      {
        reprintDate: Date,
        reason: String
      }
    ],

    digitalHash: String,
    qrCode: String,
    isVerifiable: { type: Boolean, default: false }
  },
  { timestamps: true }
);

CertificateSchema.index({ schoolId: 1, studentId: 1 });
CertificateSchema.index({ schoolId: 1, signatureApprovalStatus: 1 });
CertificateSchema.index({ certificateNumber: 1 });

export default models.Certificate || model("Certificate", CertificateSchema);
