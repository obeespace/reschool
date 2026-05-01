import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IClass extends Document {
  schoolId: mongoose.Types.ObjectId;
  level: string;
  arm: string;
  classTeacherId?: mongoose.Types.ObjectId | null;
  studentIds: mongoose.Types.ObjectId[];
  subjectIds: mongoose.Types.ObjectId[]; // Subjects taught in this class
}

const ClassSchema = new Schema<IClass>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    level: { type: String, required: true },
    arm: { type: String, required: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    subjectIds: [{ type: Schema.Types.ObjectId, ref: "Subject" }]
  },
  { timestamps: true }
);

// Virtual field for class name
ClassSchema.virtual('name').get(function() {
  return `${this.level} ${this.arm}`;
});

// Ensure virtuals are included in JSON
ClassSchema.set('toJSON', { virtuals: true });
ClassSchema.set('toObject', { virtuals: true });

export default models.Class || model<IClass>("Class", ClassSchema);
