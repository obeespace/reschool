import { Schema, model, models, Types } from "mongoose";

const AIGuidanceSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    stage: {
      type: String,
      enum: ["JSS3", "SSS3"],
      required: true
    },
    recommendation: { type: String, required: true },
    reasons: [{ type: String }]
  },
  { timestamps: true }
);

export default models.AIGuidance || model("AIGuidance", AIGuidanceSchema);
