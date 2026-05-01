import { Schema, model, models, Types } from "mongoose";

const AuditLogSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School" },
    actorId: Types.ObjectId,
    action: String,
    meta: Object
  },
  { timestamps: true }
);

export default models.AuditLog || model("AuditLog", AuditLogSchema);
