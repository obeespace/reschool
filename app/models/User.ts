import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  schoolId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "TEACHER", "PARENT"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.User || model<IUser>("User", UserSchema);
