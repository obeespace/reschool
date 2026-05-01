"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, PageHeader } from "@/app/components/UIComponents";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  priority: string;
  readAt: string | null;
  createdDate: string;
};

interface Props {
  role: "ADMIN" | "TEACHER" | "PARENT";
}

export default function NotificationsPage({ role }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const query = unreadOnly ? "?unreadOnly=true&limit=100" : "?limit=100";
      const res = await fetch(`/api/notifications/list${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotifications(data.notifications || []);
      } else {
        toast.error(data.error || "Failed to load notifications");
      }
    } catch (err) {
      console.error("Load notifications error:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [router, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to mark all as read");
        return;
      }
      toast.success("All notifications marked as read");
      await fetchNotifications();
    } catch (err) {
      console.error("Mark all read error:", err);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const priorityBadge = (priority: string) => {
    const p = String(priority || "").toUpperCase();
    if (p === "HIGH" || p === "URGENT")
      return "bg-red-100 text-red-700 border border-red-200";
    if (p === "MEDIUM")
      return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    return "bg-gray-100 text-gray-600 border border-gray-200";
  };

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading…</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <PageHeader
        title="Notifications"
        description="System alerts and updates for your account"
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded"
              />
              Show unread only
            </label>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <Button
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? "Marking…" : "Mark All as Read"}
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {unreadOnly ? "No unread notifications." : "No notifications yet."}
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-6 py-4 flex gap-4 items-start hover:bg-gray-50 transition-colors ${!n.readAt ? "bg-indigo-50/40" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {!n.readAt && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                      )}
                      <span className="font-semibold text-gray-900 text-sm">{n.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityBadge(n.priority)}`}>
                        {n.priority || "NORMAL"}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {n.createdDate
                          ? new Date(n.createdDate).toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-snug">{n.message}</p>
                    {n.actionUrl && (
                      <a
                        href={n.actionUrl}
                        className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                      >
                        View details →
                      </a>
                    )}
                  </div>
                  {!n.readAt && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="shrink-0 text-xs text-gray-400 hover:text-indigo-600 whitespace-nowrap mt-0.5"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
