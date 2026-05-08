"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode, useEffect, useState, memo, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { THEME, mergeThemeClasses } from "@/app/lib/theme";

// Lazy load icons to reduce initial bundle size
const LayoutDashboard = dynamic(() => import("lucide-react").then(mod => ({ default: mod.LayoutDashboard })), { ssr: false });
const Megaphone = dynamic(() => import("lucide-react").then(mod => ({ default: mod.Megaphone })), { ssr: false });
const Calendar = dynamic(() => import("lucide-react").then(mod => ({ default: mod.Calendar })), { ssr: false });
const BookOpen = dynamic(() => import("lucide-react").then(mod => ({ default: mod.BookOpen })), { ssr: false });
const School = dynamic(() => import("lucide-react").then(mod => ({ default: mod.School })), { ssr: false });
const Users = dynamic(() => import("lucide-react").then(mod => ({ default: mod.Users })), { ssr: false });
const GraduationCap = dynamic(() => import("lucide-react").then(mod => ({ default: mod.GraduationCap })), { ssr: false });
const UsersRound = dynamic(() => import("lucide-react").then(mod => ({ default: mod.UsersRound })), { ssr: false });
const BarChart3 = dynamic(() => import("lucide-react").then(mod => ({ default: mod.BarChart3 })), { ssr: false });
const ClipboardList = dynamic(() => import("lucide-react").then(mod => ({ default: mod.ClipboardList })), { ssr: false });
const User = dynamic(() => import("lucide-react").then(mod => ({ default: mod.User })), { ssr: false });
const LogOut = dynamic(() => import("lucide-react").then(mod => ({ default: mod.LogOut })), { ssr: false });
const Bell = dynamic(() => import("lucide-react").then(mod => ({ default: mod.Bell })), { ssr: false });
const ChevronLeft = dynamic(() => import("lucide-react").then(mod => ({ default: mod.ChevronLeft })), { ssr: false });
const Menu = dynamic(() => import("lucide-react").then(mod => ({ default: mod.Menu })), { ssr: false });

export interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "PARENT";
  children: ReactNode;
}

type AnnouncementPreview = {
  id: string;
  title?: string;
  message?: string;
  createdDate?: string;
  isNew?: boolean;
  timeAgo?: string;
  postedBy?: { name?: string } | null;
};

function DashboardLayout({ role, children }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<AnnouncementPreview[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }, [router]);

  // Memoize links to prevent recreating on every render
  const links = useMemo(() => {
    const adminLinks = [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Announcements", path: "/admin/announcements", icon: Megaphone },
      { name: "Academic Years", path: "/admin/academic-years", icon: Calendar },
      { name: "Subjects", path: "/admin/subjects", icon: BookOpen },
      { name: "Classes", path: "/admin/classes", icon: School },
      { name: "Teachers", path: "/admin/teachers", icon: Users },
      { name: "Rewards", path: "/admin/rewards", icon: BarChart3 },
      { name: "Students", path: "/admin/students", icon: GraduationCap },
      { name: "Parents", path: "/admin/parents", icon: UsersRound },
      { name: "Attendance", path: "/admin/attendance", icon: ClipboardList },
      { name: "Timetable", path: "/admin/timetable", icon: Calendar },
      { name: "Fees", path: "/admin/fees", icon: BarChart3 },
      { name: "Houses", path: "/admin/houses", icon: UsersRound },
      { name: "Certificates", path: "/admin/certificates", icon: GraduationCap },
      { name: "Reports", path: "/admin/reports", icon: BarChart3 },
      { name: "Notifications", path: "/admin/notifications", icon: Bell },
      { name: "Setup", path: "/admin/setup", icon: Calendar },
      { name: "My Profile", path: "/admin/profile", icon: User },
    ];

    const teacherLinks = [
      { name: "Dashboard", path: "/teacher/dashboard", icon: LayoutDashboard },
      { name: "Announcements", path: "/teacher/announcements", icon: Megaphone },
      { name: "My Classes", path: "/teacher/classes", icon: School },
      { name: "Students", path: "/teacher/students", icon: GraduationCap },
      { name: "Scores", path: "/teacher/scores", icon: ClipboardList },
      { name: "Attendance", path: "/teacher/attendance", icon: Users },
      { name: "My Rank", path: "/teacher/rewards", icon: BarChart3 },
      { name: "Reports", path: "/teacher/reports", icon: BarChart3 },
      { name: "Notifications", path: "/teacher/notifications", icon: Bell },
      { name: "My Profile", path: "/teacher/profile", icon: User },
    ];

    const parentLinks = [
      { name: "Dashboard", path: "/parent/dashboard", icon: LayoutDashboard },
      { name: "Announcements", path: "/parent/announcements", icon: Megaphone },
      { name: "My Wards", path: "/parent/wards", icon: UsersRound },
      { name: "Scores", path: "/parent/scores", icon: BarChart3 },
      { name: "Reports", path: "/parent/reports", icon: ClipboardList },
      { name: "Notifications", path: "/parent/notifications", icon: Bell },
      { name: "My Profile", path: "/parent/profile", icon: User },
    ];

    return role === "ADMIN" ? adminLinks : role === "TEACHER" ? teacherLinks : parentLinks;
  }, [role]);

  const fetchUnreadCount = useCallback(async () => {
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
      }
    } catch (error) {
      console.log("Unread count unavailable:", error);
    }
  }, []);

  useEffect(() => {
    // Defer non-critical features to improve initial load
    const timer = setTimeout(() => {
      fetchUnreadCount();
    }, 1000); // Increased delay to prioritize page load

    // Refresh count every 2 minutes instead of 1
    const interval = setInterval(fetchUnreadCount, 120000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (announcementId: string) => {
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
  }, [fetchUnreadCount]);

  useEffect(() => {
    links.forEach((link) => {
      router.prefetch(link.path);
    });
  }, [links, router]);

  return (
    <div className={mergeThemeClasses(
      "flex min-h-screen",
      "bg-linear-to-br from-slate-50 via-white to-blue-50/40"
    )}>
      {/* Mobile Overlay Backdrop - Only when expanded */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={mergeThemeClasses(
        'fixed inset-y-0 left-0 w-64 lg:inset-auto',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        'lg:relative',
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
        THEME.component.sidebar.backgroundColor,
        THEME.component.sidebar.border,
        'min-h-screen max-h-screen flex flex-col transition-all duration-300',
        THEME.component.sidebar.shadow,
        'z-50 lg:z-0'
      )}>
        {/* Header */}
        <div className={mergeThemeClasses(
          sidebarCollapsed ? 'p-4' : 'p-6',
          THEME.component.sidebar.borderBottom,
          'flex items-center justify-between'
        )}>
          {(!sidebarCollapsed || mobileSidebarOpen) && (
            <div>
              <h1 className={mergeThemeClasses(
                THEME.typography.h2,
                "text-gray-900 font-bold"
              )}>ReSchool</h1>
              <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-wide">{role}</p>
            </div>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileSidebarOpen(false);
                return;
              }
              setSidebarCollapsed(!sidebarCollapsed);
            }}
            className={mergeThemeClasses(
              "relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            )}
          >
            {mobileSidebarOpen ? <ChevronLeft size={20} className="text-gray-600" /> : sidebarCollapsed ? <Menu size={20} className="text-gray-600" /> : <ChevronLeft size={20} className="text-gray-600" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 p-3 overflow-y-auto min-h-0">
          <ul className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    prefetch={true}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={mergeThemeClasses(
                      "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-[background-color,border-color,box-shadow,color] duration-200",
                      isActive
                        ? "bg-white text-blue-700 border-blue-200/90 shadow-[0_8px_18px_-14px_rgba(37,99,235,0.7)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-blue-600"
                        : "text-gray-700 hover:bg-white/85 hover:border-slate-200/90 hover:shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)]"
                    )}
                    title={sidebarCollapsed ? link.name : undefined}
                  >
                    <Icon size={20} className={mergeThemeClasses(
                      isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700',
                      'shrink-0'
                    )} />
                    {!sidebarCollapsed && <span className="font-medium text-sm">{link.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className={mergeThemeClasses(
          "p-3",
          THEME.component.sidebar.borderTop
        )}>
          <button
            onClick={handleLogout}
            className={mergeThemeClasses(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-gray-700 hover:bg-red-50/80 hover:border-red-100 hover:text-red-600 transition-[background-color,border-color,box-shadow,color] duration-200"
            )}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut size={20} className="text-gray-500 hover:text-red-600 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col w-full lg:w-auto">
        {/* Top Bar */}
        <div className={mergeThemeClasses(
          THEME.component.card.backgroundColor,
          THEME.component.card.border,
          "border-b px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10 backdrop-blur supports-backdrop-filter:bg-white/92",
          THEME.component.card.shadow
        )}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            <h2 className="text-sm font-medium text-slate-600 tracking-tight">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 bg-white/80"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl border border-transparent hover:bg-slate-100 hover:border-slate-200 transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-[0_24px_60px_-30px_rgba(2,6,23,0.65)] border border-slate-200/80 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <button
                      onClick={() => {
                        const announcementsPath = `/${role.toLowerCase()}/announcements`;
                        router.push(announcementsPath);
                        setShowNotifications(false);
                      }}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View All
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {recentAnnouncements.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell size={40} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No new announcements</p>
                      </div>
                    ) : (
                      recentAnnouncements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className="p-4 border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors"
                          onClick={() => {
                            markAsRead(announcement.id);
                            const announcementsPath = `/${role.toLowerCase()}/announcements`;
                            router.push(announcementsPath);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                              <Megaphone size={16} className="text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">{announcement.title}</h4>
                                {announcement.isNew && (
                                  <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-1.5"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{announcement.message}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <span className="truncate">{announcement.postedBy?.name}</span>
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
        </div>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardLayout);
