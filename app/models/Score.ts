import { Schema, model, models, Types } from "mongoose";

const ScoreSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    subject: { type: String, required: true },
    term: { type: Number, enum: [1, 2, 3], required: true },
    classwork: { type: Number, default: 0 },
    test: { type: Number, default: 0 },
    exam: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    teacherId: { type: Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default models.Score || model("Score", ScoreSchema);
