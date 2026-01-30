import { Schema, model, models, Types } from "mongoose";

const StudentSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    fullName: { type: String, required: true },
    admissionNumber: { type: String, required: true },
    dateOfBirth: { type: Date, required: false },
    gender: { type: String, enum: ["Male", "Female"], required: false },
    parentId: { type: Types.ObjectId, ref: "User", required: false },
    currentClassId: { type: Types.ObjectId, ref: "Class", required: true }
  },
  { timestamps: true }
);

export default models.Student || model("Student", StudentSchema);
