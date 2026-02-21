import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  schoolId?: mongoose.Types.ObjectId | null;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  passwordHash: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: false, default: null },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: false, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "TEACHER", "PARENT"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.User || model<IUser>("User", UserSchema);
