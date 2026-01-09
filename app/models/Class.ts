import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IClass extends Document {
  schoolId: mongoose.Types.ObjectId;
  level: string;
  arm: string;
  classTeacherId?: mongoose.Types.ObjectId | null;
  studentIds: mongoose.Types.ObjectId[];
}

const ClassSchema = new Schema<IClass>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    level: { type: String, enum: ["JSS1","JSS2","JSS3","SSS1","SSS2","SSS3"], required: true },
    arm: { type: String, enum: ["A","B","C"], required: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export default models.Class || model<IClass>("Class", ClassSchema);
