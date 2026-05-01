import { Schema, model, models, Types } from "mongoose";

export type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface IPeriod {
  periodNumber: number;   // 1, 2, 3…
  startTime: string;      // "08:00"
  endTime: string;        // "08:45"
  subjectId?: Types.ObjectId;
  subjectName?: string;   // denormalised for display
  teacherId?: Types.ObjectId;
  teacherName?: string;   // denormalised for display
  label?: string;         // for non-subject slots: "Break", "Assembly", "Games"
}

export interface IDaySchedule {
  day: Day;
  periods: IPeriod[];
}

export interface ITimetable {
  schoolId: Types.ObjectId;
  classId: Types.ObjectId;
  className: string;      // denormalised for display
  termId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  schedule: IDaySchedule[];
  createdBy: Types.ObjectId;
  lastUpdatedBy?: Types.ObjectId;
}

const PeriodSchema = new Schema<IPeriod>(
  {
    periodNumber: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    subjectName: String,
    teacherId: { type: Schema.Types.ObjectId, ref: "User" },
    teacherName: String,
    label: String,
  },
  { _id: false }
);

const DayScheduleSchema = new Schema<IDaySchedule>(
  {
    day: { type: String, enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT"], required: true },
    periods: [PeriodSchema],
  },
  { _id: false }
);

const TimetableSchema = new Schema<ITimetable>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    className: { type: String, required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    schedule: [DayScheduleSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One timetable per class per term
TimetableSchema.index({ schoolId: 1, classId: 1, termId: 1 }, { unique: true });
TimetableSchema.index({ schoolId: 1, termId: 1 });

export default models.Timetable || model<ITimetable>("Timetable", TimetableSchema);
