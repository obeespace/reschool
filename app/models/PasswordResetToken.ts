import { Schema, model, models, Types } from "mongoose";

const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PasswordResetTokenSchema.index({ userId: 1 });

export default models.PasswordResetToken || model("PasswordResetToken", PasswordResetTokenSchema);
