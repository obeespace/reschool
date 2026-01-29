"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Users, GraduationCap, UsersRound, School, Calendar, BookOpen, TrendingUp, Activity } from "lucide-react";

// Lazy load non-critical components
const DashboardLayout = dynamic(() => import("@/app/components/Sidebar"), { ssr: false });
const StatCard = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.StatCard })));
const PageHeader = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.PageHeader })));
const LoadingSpinner = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.LoadingSpinner })));

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    parents: 0,
    classes: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    targetAudience: "ALL"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Verify admin role
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "ADMIN") {
        router.push("/login");
        return;
      }
    } catch (error) {
      router.push("/login");
      return;
    }

    // Load stats immediately
    setStats({
      teachers: 25,
      students: 450,
      parents: 380,
      classes: 18,
    });
    setIsLoading(false);

    // Defer announcement loading to not block UI
    setTimeout(() => {
      fetchAnnouncements();
    }, 100);
  }, [router]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/announcements/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  }, []);

  const handleCreateAnnouncement = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/announcements/admin-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(announcementForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Announcement created successfully!");
        setAnnouncementForm({ title: "", message: "", targetAudience: "ALL" });
        setShowAnnouncementForm(false);
        fetchAnnouncements();
      } else {
        toast.error(data.error || "Failed to create announcement");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchAnnouncements]);

  const handleNavigation = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  if (isLoading) {
    return (
      <DashboardLayout role="ADMIN">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Admin Dashboard"
        description="Monitor and manage your school's academic operations"
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Teachers" 
            value={stats.teachers} 
            icon={Users} 
            color="indigo"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard 
            title="Total Students" 
            value={stats.students} 
            icon={GraduationCap} 
            color="green"
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard 
            title="Active Parents" 
            value={stats.parents} 
            icon={UsersRound} 
            color="purple"
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard 
            title="Total Classes" 
            value={stats.classes} 
            icon={School} 
            color="blue"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-indigo-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/academic-years" prefetch={true}>
              <button
                onClick={() => handleNavigation("/admin/academic-years")}
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg transition-colors">
                    <Calendar size={20} className="text-indigo-600" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Academic Years</div>
                </div>
                <div className="text-sm text-gray-600">Manage sessions & terms</div>
              </button>
            </Link>

            <Link href="/admin/subjects" prefetch={true}>
              <button
                onClick={() => handleNavigation("/admin/subjects")}
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                    <BookOpen size={20} className="text-green-600" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Subjects</div>
                </div>
                <div className="text-sm text-gray-600">Add and configure subjects</div>
              </button>
            </Link>

            <Link href="/admin/classes" prefetch={true}>
              <button
                onClick={() => handleNavigation("/admin/classes")}
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                    <School size={20} className="text-blue-600" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Classes</div>
                </div>
                <div className="text-sm text-gray-600">Create and link subjects</div>
              </button>
            </Link>

            <Link href="/admin/teachers" prefetch={true}>
              <button
                onClick={() => handleNavigation("/admin/teachers")}
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Teachers</div>
                </div>
                <div className="text-sm text-gray-600">Add and assign teachers</div>
              </button>
            </Link>

            <Link href="/admin/students" prefetch={true}>
              <button
                onClick={() => handleNavigation("/admin/students")}
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-amber-100 group-hover:bg-amber-200 rounded-lg transition-colors">
                    <GraduationCap size={20} className="text-amber-600" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Students</div>
                </div>
                <div className="text-sm text-gray-600">Monitor student records</div>
              </button>
            </Link>

            <Link href="/admin/reports" prefetch={true}>
              <button
                onClick={() => handleNavigation("/admin/reports")}
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors">
                    <TrendingUp size={20} className="text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Reports</div>
                </div>
                <div className="text-sm text-gray-600">Analytics and reports</div>
              </button>
            </Link>
          </div>
        </div>

        {/* System Overview & Announcements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-indigo-600" />
              System Overview
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div>
                  <div className="font-medium text-gray-900 text-sm">Current Academic Year</div>
                  <div className="text-xs text-gray-600 mt-0.5">2024/2025 - First Term</div>
                </div>
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold shadow-sm">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="font-medium text-gray-900 text-sm">Total Classes</div>
                  <div className="text-xs text-gray-600 mt-0.5">JSS1-3, SSS1-3 (A, B, C arms)</div>
                </div>
                <span className="text-2xl font-bold text-indigo-600">18</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div>
                  <div className="font-medium text-gray-900 text-sm">Subscription Status</div>
                  <div className="text-xs text-gray-600 mt-0.5">Valid until July 2026</div>
                </div>
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold shadow-sm">
                  Paid
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Recent Activity
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">New teacher registered</p>
                  <p className="text-xs text-gray-600 mt-0.5">Mr. John Doe joined Mathematics dept.</p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <GraduationCap size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Students enrolled</p>
                  <p className="text-xs text-gray-600 mt-0.5">15 new students added to JSS1</p>
                  <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <School size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Class created</p>
                  <p className="text-xs text-gray-600 mt-0.5">SSS3C has been set up</p>
                  <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Announcements
            </h2>
            <button
              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
              {showAnnouncementForm ? "Cancel" : "+ New Announcement"}
            </button>
          </div>

          {showAnnouncementForm && (
            <form onSubmit={handleCreateAnnouncement} className="mb-6 p-5 bg-linear-to-br from-gray-50 to-white rounded-xl border border-gray-200">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  required
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                  rows={4}
                  placeholder="Enter announcement message"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                <select
                  value={announcementForm.targetAudience}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, targetAudience: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm bg-white"
                >
                  <option value="ALL">All (Teachers & Parents)</option>
                  <option value="TEACHERS_AND_PARENTS">Teachers and Parents</option>
                  <option value="TEACHERS_ONLY">Teachers Only</option>
                  <option value="PARENTS_ONLY">Parents Only</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors font-medium text-sm shadow-sm"
              >
                {isSubmitting ? "Creating..." : "Create Announcement"}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <p className="text-sm">No announcements yet</p>
                <p className="text-xs mt-1">Create your first announcement to get started</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 text-base">{announcement.title}</h3>
                    <span className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium whitespace-nowrap ml-2">
                      {announcement.targetAudience.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mb-3 leading-relaxed">{announcement.message}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{announcement.postedBy.name}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{announcement.postedBy.role}</span>
                    </span>
                    <span>{new Date(announcement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {announcement.className && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-blue-600 font-medium">Class: {announcement.className}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
