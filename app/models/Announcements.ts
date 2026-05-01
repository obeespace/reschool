import { Schema, model, models, Types } from "mongoose";

const AnnouncementSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: "School", required: true },
    classId: { type: Types.ObjectId, ref: "Class", default: null }, // null for general announcements
    title: { type: String, required: true },
    message: { type: String, required: true },
    postedBy: { type: Types.ObjectId, ref: "User", required: true },
    announcementType: { 
      type: String, 
      enum: ["GENERAL", "CLASS_SPECIFIC"], 
      required: true,
      default: "GENERAL"
    },
    targetAudience: { 
      type: String, 
      enum: ["ALL", "TEACHERS_AND_PARENTS", "TEACHERS_ONLY", "PARENTS_ONLY"], 
      required: true,
      default: "ALL"
    }
  },
  { timestamps: true }
);

// Index for efficient querying
AnnouncementSchema.index({ schoolId: 1, announcementType: 1, createdAt: -1 });
AnnouncementSchema.index({ schoolId: 1, classId: 1, createdAt: -1 });

export default models.Announcement || model("Announcement", AnnouncementSchema);
