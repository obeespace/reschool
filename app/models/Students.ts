import { Schema, model, models, Types } from "mongoose";

const StudentSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    fullName: { type: String, required: true },
    parentId: { type: Types.ObjectId, ref: "User", required: true },
    currentClassId: { type: Types.ObjectId, ref: "Class", required: true }
  },
  { timestamps: true }
);

export default models.Student || model("Student", StudentSchema);
