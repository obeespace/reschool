import { Schema, model, models, Types } from "mongoose";

const AnnouncementReadSchema = new Schema(
  {
    announcementId: { type: Types.ObjectId, ref: "Announcement", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Compound index to ensure a user can only mark an announcement as read once
AnnouncementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

export default models.AnnouncementRead || model("AnnouncementRead", AnnouncementReadSchema);
