import { Schema, model, models, Types } from "mongoose";

export interface INotification {
  schoolId: Types.ObjectId;
  recipientId: Types.ObjectId;
  recipientRole: "PARENT" | "STUDENT" | "ADMIN" | "TEACHER";

  type:
    | "ANNOUNCEMENT"
    | "REPORT_READY"
    | "PAYMENT_DUE"
    | "ATTENDANCE_WARNING"
    | "BEHAVIOR_ALERT"
    | "MARK_UPDATE"
    | "CERTIFICATE_READY";

  title: string;
  message: string;
  actionUrl?: string;

  deliveryChannels: Array<"IN_APP" | "EMAIL" | "SMS">;
  deliveredAt: Date;
  readAt?: Date;

  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdDate: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientRole: {
      type: String,
      enum: ["PARENT", "STUDENT", "ADMIN", "TEACHER"],
      required: true
    },

    type: {
      type: String,
      enum: [
        "ANNOUNCEMENT",
        "REPORT_READY",
        "PAYMENT_DUE",
        "ATTENDANCE_WARNING",
        "BEHAVIOR_ALERT",
        "MARK_UPDATE",
        "CERTIFICATE_READY"
      ],
      required: true
    },

    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: String,

    deliveryChannels: {
      type: [String],
      enum: ["IN_APP", "EMAIL", "SMS"],
      default: ["IN_APP"]
    },
    deliveredAt: { type: Date, default: Date.now },
    readAt: Date,

    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL"
    },
    createdDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

NotificationSchema.index({ schoolId: 1, recipientId: 1, readAt: 1 });
NotificationSchema.index({ schoolId: 1, createdDate: -1 });

export default models.Notification || model("Notification", NotificationSchema);
