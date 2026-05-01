import { Schema, model, models, Types } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    plan: {
      type: String,
      enum: ["STARTER", "PRO", "ENTERPRISE"],
      required: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "INACTIVE"
    },
    expiresAt: Date
  },
  { timestamps: true }
);

export default models.Subscription || model("Subscription", SubscriptionSchema);
