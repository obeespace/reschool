import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ISchool extends Document {
  name: string;
  domainSlug: string;
  logoUrl?: string;
  adminUserId: mongoose.Types.ObjectId;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true },
    domainSlug: { type: String, required: true, unique: true },
    logoUrl: { type: String, default: "" },
    adminUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default models.School || model<ISchool>("School", SchoolSchema);
