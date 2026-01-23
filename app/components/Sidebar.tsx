"use client";

import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "PARENT";
  children: ReactNode;
}

export default function DashboardLayout({ role, children }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "🏠" },
    { name: "Announcements", path: "/admin/announcements", icon: "📢" },
    { name: "Academic Years", path: "/admin/academic-years", icon: "📅" },
    { name: "Subjects", path: "/admin/subjects", icon: "📚" },
    { name: "Classes", path: "/admin/classes", icon: "🏫" },
    { name: "Teachers", path: "/admin/teachers", icon: "👨‍🏫" },
    { name: "Students", path: "/admin/students", icon: "👨‍🎓" },
    { name: "Parents", path: "/admin/parents", icon: "👪" },
    { name: "Reports", path: "/admin/reports", icon: "📊" },
  ];

  const teacherLinks = [
    { name: "Dashboard", path: "/teacher/dashboard", icon: "🏠" },
    { name: "Announcements", path: "/teacher/announcements", icon: "📢" },
    { name: "My Classes", path: "/teacher/classes", icon: "🏫" },
    { name: "Students", path: "/teacher/students", icon: "👨‍🎓" },
    { name: "Scores", path: "/teacher/scores", icon: "📝" },
    { name: "My Profile", path: "/teacher/profile", icon: "👤" },
  ];

  const parentLinks = [
    { name: "Dashboard", path: "/parent/dashboard", icon: "🏠" },
    { name: "Announcements", path: "/parent/announcements", icon: "📢" },
    { name: "My Wards", path: "/parent/wards", icon: "👨‍👩‍👧‍👦" },
    { name: "Scores", path: "/parent/scores", icon: "📊" },
  ];

  const links =
    role === "ADMIN" ? adminLinks : role === "TEACHER" ? teacherLinks : parentLinks;

  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      fetchUnreadCount();
    }, 500);
    
    // Refresh count every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/announcements/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
        setRecentAnnouncements(data.recentAnnouncements || []);
      } else {
        // Silently fail for non-critical feature
        console.log("Could not fetch unread count");
      }
    } catch (error) {
      // Silently fail - announcements are not critical for navigation
      console.log("Unread count unavailable:", error);
    }
  };

  const markAsRead = async (announcementId: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/announcements/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ announcementId }),
      });
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-64 bg-indigo-900 text-white min-h-screen flex flex-col">
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-2xl font-bold">ReSchool</h1>
          <p className="text-indigo-300 text-sm mt-1">{role}</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.path}>
                <button
                  onClick={() => router.push(link.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    pathname === link.path
                      ? "bg-indigo-700 text-white"
                      : "text-indigo-200 hover:bg-indigo-800"
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-indigo-200 hover:bg-indigo-800 transition"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {/* Top notification bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-end items-center">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition"
            >
              <span className="text-2xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <button
                    onClick={() => {
                      const announcementsPath = `/${role.toLowerCase()}/announcements`;
                      router.push(announcementsPath);
                      setShowNotifications(false);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    View All
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {recentAnnouncements.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <span className="text-4xl block mb-2">📭</span>
                      <p>No new announcements</p>
                    </div>
                  ) : (
                    recentAnnouncements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          markAsRead(announcement.id);
                          const announcementsPath = `/${role.toLowerCase()}/announcements`;
                          router.push(announcementsPath);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">📢</span>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{announcement.title}</h4>
                              {announcement.isNew && (
                                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">{announcement.message}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>{announcement.postedBy?.name}</span>
                              <span>•</span>
                              <span>{announcement.timeAgo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
