import { Schema, model, models, Types } from "mongoose";

const AnnouncementSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    classId: { type: Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    postedBy: { type: Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default models.Announcement || model("Announcement", AnnouncementSchema);
