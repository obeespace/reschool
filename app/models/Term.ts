import { Schema, model, models, Types } from "mongoose";

export interface ITerm {
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  termNumber: number; // 1, 2, or 3
  startDate: Date;
  endDate: Date;
  isActive: boolean; // Only one term can be active per school at a time
  isPaid: boolean; // Whether school has paid for this term
  isClosed: boolean; // Whether term has been closed (no more edits allowed)
  paymentDate?: Date;
  paymentReference?: string;
}

const TermSchema = new Schema<ITerm>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    termNumber: { type: Number, enum: [1, 2, 3], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
    paymentDate: { type: Date },
    paymentReference: { type: String }
  },
  { timestamps: true }
);

// Ensure only one active term per school
TermSchema.index({ schoolId: 1, isActive: 1 });

// Ensure unique term per academic year
TermSchema.index(
  { academicYearId: 1, termNumber: 1 },
  { unique: true }
);

// Index for querying paid terms
TermSchema.index({ schoolId: 1, isPaid: 1 });

export default models.Term || model<ITerm>("Term", TermSchema);
