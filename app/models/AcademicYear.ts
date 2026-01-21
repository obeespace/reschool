import { Schema, model, models, Types } from "mongoose";

export interface IAcademicYear {
  schoolId: Types.ObjectId;
  name: string; // e.g., "2023/2024 Academic Year"
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  term?: number; // Current term (1, 2, or 3)
}

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    term: { type: Number, enum: [1, 2, 3], default: 1 }
  },
  { timestamps: true }
);

// Ensure only one active academic year per school
AcademicYearSchema.index({ schoolId: 1, isActive: 1 });

export default models.AcademicYear || model<IAcademicYear>("AcademicYear", AcademicYearSchema);
