import { Schema, model, models, Types } from "mongoose";

export interface ISchoolSetup {
  _id?: Types.ObjectId;
  schoolId: Types.ObjectId;
  schoolName: string;
  address?: string;
  classLevels: string[]; // e.g., ["Primary 1", "Primary 2", "JSS1", "SS1", etc.]
  classArms: string[]; // e.g., ["A", "B", "C"] or ["Gold", "Silver", "Diamond"]
  subjects: string[]; // e.g., ["English Language", "Mathematics", "Biology", etc.]
  admissionNumberFormat: {
    prefix: string; // e.g., "ROYAL"
    yearFormat: "YYYY" | "YY"; // Full year or short year
    numberLength: number; // e.g., 3 for 001, 4 for 0001
  };
  setupCompletedAt?: Date;
  isSetupComplete: boolean;
  setupCompletedBy?: Types.ObjectId; // Admin user ID who completed setup
  createdAt: Date;
  updatedAt: Date;
}

const schoolSetupSchema = new Schema<ISchoolSetup>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    classLevels: {
      type: [String],
      required: true,
      default: [],
    },
    classArms: {
      type: [String],
      required: true,
      default: [],
    },
    subjects: {
      type: [String],
      required: true,
      default: [],
    },
    admissionNumberFormat: {
      prefix: {
        type: String,
        required: true,
      },
      yearFormat: {
        type: String,
        enum: ["YYYY", "YY"],
        default: "YYYY",
      },
      numberLength: {
        type: Number,
        min: 2,
        max: 6,
        default: 3,
      },
    },
    setupCompletedAt: {
      type: Date,
    },
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
    setupCompletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one setup per school
schoolSetupSchema.index({ schoolId: 1 }, { unique: true });

export default models.SchoolSetup || model<ISchoolSetup>("SchoolSetup", schoolSetupSchema);
