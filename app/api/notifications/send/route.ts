import connectDB from "@/app/utils/db";
import Notification from "@/app/models/Notification";
import User from "@/app/models/User";
import ReportCard from "@/app/models/ReportCard";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Send Notification API
 * For triggers: report ready, payment due, announcement, low attendance, mark update, certificate ready
 * Access: System (automated) or ADMIN (manual)
 */

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { type, title, message, recipientIds, actionUrl, priority, channels } = body;

    if (!type || !title || !message || !recipientIds || recipientIds.length === 0) {
      return NextResponse.json(
        { error: "type, title, message, and recipientIds are required" },
        { status: 400 }
      );
    }

    // Allowed types
    const validTypes = [
      "ANNOUNCEMENT",
      "REPORT_READY",
      "PAYMENT_DUE",
      "ATTENDANCE_WARNING",
      "BEHAVIOR_ALERT",
      "MARK_UPDATE",
      "CERTIFICATE_READY"
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Allowed: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Default channels to IN_APP (SMS/EMAIL future expansion)
    const deliveryChannels = channels || ["IN_APP"];

    // Create notifications for each recipient
    const notifications: any[] = [];
    const now = new Date();

    for (const recipientId of recipientIds) {
      const notification = await Notification.create({
        type,
        title,
        message,
        recipientId,
        actionUrl,
        deliveryChannels,
        priority: priority || "NORMAL",
        sentBy: user.role === "ADMIN" ? user.id : null, // null if system-triggered
        sentAt: now,
        readAt: null
      });

      notifications.push(notification);
    }

    return NextResponse.json({
      message: `${notifications.length} notification(s) sent`,
      notificationCount: notifications.length,
      type,
      channels: deliveryChannels
    });
  } catch (error: any) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}

/**
 * System-triggered notification helper
 * Called internally by other APIs (report generation, payment alerts, etc)
 */
export async function notifyReportReady(
  schoolId: string,
  termId: string,
  studentId: string,
  reportCardId: string
) {
  try {
    // Get student's parent(s)
    const student = await User.findById(studentId);
    if (!student || !student.parentId) return;

    // Create notification
    await Notification.create({
      type: "REPORT_READY",
      title: "Report Card Ready",
      message: `${student.fullName}'s report card for the term is ready to view`,
      recipientId: student.parentId,
      actionUrl: `/parent/scores?term=${termId}&student=${studentId}`,
      deliveryChannels: ["IN_APP"],
      priority: "HIGH",
      sentAt: new Date()
    });
  } catch (error) {
    console.error("Notify report ready error:", error);
  }
}

export async function notifyPaymentDue(schoolId: string, termId: string, adminId: string) {
  try {
    // Notify all admins in school
    const admins = await User.find({ schoolId, role: "ADMIN" });

    await Notification.insertMany(
      admins.map((admin) => ({
        type: "PAYMENT_DUE",
        title: "Payment Reminder",
        message: "A new term is active. Ensure subscription payment is complete.",
        recipientId: admin._id,
        actionUrl: `/admin/payments?term=${termId}`,
        deliveryChannels: ["IN_APP"],
        priority: "URGENT",
        sentAt: new Date()
      }))
    );
  } catch (error) {
    console.error("Notify payment due error:", error);
  }
}

export async function notifyLowAttendance(
  schoolId: string,
  studentId: string,
  attendancePercentage: number
) {
  try {
    const student = await User.findById(studentId);
    if (!student || !student.parentId) return;

    await Notification.create({
      type: "ATTENDANCE_WARNING",
      title: "Low Attendance Alert",
      message: `${student.fullName} has ${attendancePercentage}% attendance. Please follow up.`,
      recipientId: student.parentId,
      actionUrl: `/parent/wards?view=attendance`,
      deliveryChannels: ["IN_APP"],
      priority: "HIGH",
      sentAt: new Date()
    });
  } catch (error) {
    console.error("Notify low attendance error:", error);
  }
}

export async function notifyMarkUpdate(
  schoolId: string,
  studentId: string,
  assessmentType: string
) {
  try {
    const student = await User.findById(studentId);
    if (!student || !student.parentId) return;

    await Notification.create({
      type: "MARK_UPDATE",
      title: `New ${assessmentType} Mark`,
      message: `A new ${assessmentType} mark has been recorded for ${student.fullName}`,
      recipientId: student.parentId,
      actionUrl: `/parent/scores`,
      deliveryChannels: ["IN_APP"],
      priority: "NORMAL",
      sentAt: new Date()
    });
  } catch (error) {
    console.error("Notify mark update error:", error);
  }
}
