import { Schema, model, models, Types } from "mongoose";

const TeacherRewardWinnersSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    termId: { type: Types.ObjectId, ref: "Term", required: true },
    teacherId: { type: Types.ObjectId, ref: "User", required: true },
    rank: { type: Number, required: true },
    points: { type: Number, default: 0 },
    breakdown: { type: Object, default: {} },
    finalizedBy: { type: Types.ObjectId, ref: "User" },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

TeacherRewardWinnersSchema.index({ schoolId: 1, termId: 1 });

export default models.TeacherRewardWinners || model("TeacherRewardWinners", TeacherRewardWinnersSchema);
