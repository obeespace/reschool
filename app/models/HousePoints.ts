import { Schema, model, models, Types } from "mongoose";

export interface IHousePoints {
  schoolId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  termId: Types.ObjectId;
  houseName: string;                                        // e.g. "Red", "Awolowo", "Gold"
  category: "SPORTS" | "ACADEMIC" | "CULTURAL" | "GENERAL";
  points: number;
  description: string;
  studentId?: Types.ObjectId;                               // student who earned points (optional)
  awardedBy: Types.ObjectId;                                // teacher/admin
}

const HousePointsSchema = new Schema<IHousePoints>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    houseName: { type: String, required: true },
    category: {
      type: String,
      enum: ["SPORTS", "ACADEMIC", "CULTURAL", "GENERAL"],
      required: true,
    },
    points: { type: Number, required: true },
    description: { type: String, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    awardedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

HousePointsSchema.index({ schoolId: 1, termId: 1, houseName: 1 });
HousePointsSchema.index({ schoolId: 1, academicYearId: 1 });

export default models.HousePoints || model<IHousePoints>("HousePoints", HousePointsSchema);
