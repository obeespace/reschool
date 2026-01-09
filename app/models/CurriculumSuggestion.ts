import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ICurriculumSuggestion extends Document {
  schoolId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  suggestions: string[];
  generatedAt: Date;
}

const CurriculumSuggestionSchema = new Schema<ICurriculumSuggestion>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    suggestions: [{ type: String }],
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default models.CurriculumSuggestion || model<ICurriculumSuggestion>(
  "CurriculumSuggestion",
  CurriculumSuggestionSchema
);
