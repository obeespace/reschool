import { Schema, model, models, Types } from "mongoose";

const StudentClassHistorySchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    studentId: { type: Types.ObjectId, ref: "User", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    session: { type: String, required: true },
    termAverages: [{ type: Number }], // 3 terms
    finalAverage: { type: Number, default: 0 },
    promoted: { type: Boolean, default: false },
    repeated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default models.StudentClassHistory ||
  model("StudentClassHistory", StudentClassHistorySchema);
