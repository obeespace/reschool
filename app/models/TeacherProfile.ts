import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ITeacherProfile extends Document {
  schoolId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Reference to User with role TEACHER
  classTeacherOf?: mongoose.Types.ObjectId | null; // Class they are class teacher of
  subjectsAndClasses: {
    subjectId: mongoose.Types.ObjectId;
    classIds: mongoose.Types.ObjectId[]; // Classes they teach this subject in
  }[];
}

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    classTeacherOf: { type: Schema.Types.ObjectId, ref: "Class", default: null },
    subjectsAndClasses: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
        classIds: [{ type: Schema.Types.ObjectId, ref: "Class" }]
      }
    ]
  },
  { timestamps: true }
);

// Index for efficient queries
TeacherProfileSchema.index({ userId: 1 });
TeacherProfileSchema.index({ schoolId: 1 });

export default models.TeacherProfile || model<ITeacherProfile>("TeacherProfile", TeacherProfileSchema);
