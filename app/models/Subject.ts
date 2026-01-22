import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ISubject extends Document {
  schoolId: mongoose.Types.ObjectId;
  name: string; // e.g., "Mathematics", "English Language", "Basic Science"
  code?: string; // Optional subject code
}

const SubjectSchema = new Schema<ISubject>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    code: { type: String }
  },
  { timestamps: true }
);

// Ensure unique subject names per school
SubjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default models.Subject || model<ISubject>("Subject", SubjectSchema);
