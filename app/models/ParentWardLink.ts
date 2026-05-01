import { Schema, model, models, Types } from "mongoose";

const ParentWardLinkSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    parentId: { type: Types.ObjectId, ref: "User", required: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    relationship: { type: String, default: "GUARDIAN" },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ParentWardLinkSchema.index({ schoolId: 1, parentId: 1, studentId: 1 }, { unique: true });
ParentWardLinkSchema.index({ schoolId: 1, parentId: 1 });
ParentWardLinkSchema.index({ schoolId: 1, studentId: 1 });

export default models.ParentWardLink || model("ParentWardLink", ParentWardLinkSchema);