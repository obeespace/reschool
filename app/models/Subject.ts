import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ISubject extends Document {
  schoolId: mongoose.Types.ObjectId;
  name: string; // e.g., "Mathematics", "English Language", "Basic Science"
  code?: string;      // Internal/school subject code
  waecCode?: string;  // WAEC/NECO official subject code (e.g. "101" for English Language)
}

const SubjectSchema = new Schema<ISubject>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    code: { type: String },       // Internal/school subject code
    waecCode: { type: String },   // WAEC/NECO official subject code (e.g. "101" for English Language)
  },
  { timestamps: true }
);

// Ensure unique subject names per school
SubjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default models.Subject || model<ISubject>("Subject", SubjectSchema);
