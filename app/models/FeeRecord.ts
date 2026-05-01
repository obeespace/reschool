import { Schema, model, models, Types } from "mongoose";

export type FeeType =
  | "TUITION"
  | "PTA"
  | "DEVELOPMENT"
  | "WAEC_LEVY"
  | "NECO_LEVY"
  | "SPORTS"
  | "UNIFORM"
  | "BOOKS"
  | "ICT"
  | "BUS"
  | "OTHER";

export interface IFeeItem {
  feeType: FeeType;
  label: string;          // Human-readable label, e.g. "Tuition Fee"
  amountDue: number;      // Amount owed
  amountPaid: number;     // Amount paid so far
  balance: number;        // amountDue - amountPaid
  isPaid: boolean;
  paidDate?: Date;
  receiptNumber?: string;
  recordedBy: Types.ObjectId;
}

export interface IFeeRecord {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  termId: Types.ObjectId;
  termNumber: number;    // 1 | 2 | 3 — denormalised for fast queries

  fees: IFeeItem[];

  totalDue: number;
  totalPaid: number;
  totalBalance: number;

  createdBy: Types.ObjectId;
}

const FeeItemSchema = new Schema<IFeeItem>(
  {
    feeType: {
      type: String,
      enum: ["TUITION", "PTA", "DEVELOPMENT", "WAEC_LEVY", "NECO_LEVY", "SPORTS", "UNIFORM", "BOOKS", "ICT", "BUS", "OTHER"],
      required: true,
    },
    label: { type: String, required: true },
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidDate: Date,
    receiptNumber: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const FeeRecordSchema = new Schema<IFeeRecord>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    termNumber: { type: Number, enum: [1, 2, 3], required: true },

    fees: [FeeItemSchema],

    totalDue: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalBalance: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Unique record per student per term
FeeRecordSchema.index({ schoolId: 1, studentId: 1, termId: 1 }, { unique: true });
FeeRecordSchema.index({ schoolId: 1, termId: 1 });

export default models.FeeRecord || model<IFeeRecord>("FeeRecord", FeeRecordSchema);
