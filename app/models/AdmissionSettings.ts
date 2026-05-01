import { Schema, model, models, Types } from "mongoose";

const AdmissionSettingsSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true, unique: true },
    prefix: { type: String, required: true, default: "ADM" },
    yearFormat: { type: String, enum: ["YYYY", "YY"], default: "YYYY" },
    numberLength: { type: Number, min: 2, max: 6, default: 4 },
  },
  { timestamps: true }
);

AdmissionSettingsSchema.index({ schoolId: 1 }, { unique: true });

export default models.AdmissionSettings || model("AdmissionSettings", AdmissionSettingsSchema);
