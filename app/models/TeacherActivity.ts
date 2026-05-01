import { Schema, model, models, Types } from "mongoose";

const TeacherActivitySchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    teacherId: { type: Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true } // e.g. UPLOAD_SCORE, POST_ANNOUNCEMENT
  },
  { timestamps: true }
);

export default models.TeacherActivity ||
  model("TeacherActivity", TeacherActivitySchema);
