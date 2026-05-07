"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Users, GraduationCap, UsersRound, School, Calendar, BookOpen, TrendingUp, Activity } from "lucide-react";
import { ApiRequestError, cachedApiGet } from "@/app/utils/clientCache";

// Lazy load non-critical components
const DashboardLayout = dynamic(() => import("@/app/components/Sidebar"), { ssr: false });
const StatCard = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.StatCard })));
const PageHeader = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.PageHeader })));
const LoadingSpinner = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.LoadingSpinner })));
const Modal = dynamic(() => import("@/app/components/UIComponents").then(mod => ({ default: mod.Modal })));

type ActiveTermInfo = {
  academicYear: string;
  term: number;
  isPaid: boolean;
  isClosed: boolean;
  startDate: string;
  endDate: string;
} | null;

type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  targetAudience: string;
  createdAt: string;
  className?: string;
  postedBy: {
    name: string;
    role: string;
  };
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    parents: 0,
    classes: 0,
    subjects: 0,
  });
  const [schoolName, setSchoolName] = useState("");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    targetAudience: "ALL"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTerm, setActiveTerm] = useState<ActiveTermInfo>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isSetupSubmitting, setIsSetupSubmitting] = useState(false);
  const [setupForm, setSetupForm] = useState({
    name: "",
    startDate: "",
    endDate: ""
  });

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await cachedApiGet<{ stats: typeof stats; schoolName: string; activeTerm: ActiveTermInfo }>({
        key: `admin:stats:${token.slice(-12)}`,
        url: "/api/admin/stats",
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 60_000,
      });
      setStats(data.stats);
      setSchoolName(data.schoolName);
      setActiveTerm(data.activeTerm || null);
      setShowSetupModal(!data.activeTerm);
      if (!data.activeTerm) {
        router.push("/admin/setup");
        return;
      }
      // Auto-backfill Subject/Class records if setup was completed before
      // the migration that creates those records (safe to run multiple times)
      if (data.stats.subjects === 0 || data.stats.classes === 0) {
        const migrateToken = localStorage.getItem("token");
        if (migrateToken) {
          fetch("/api/admin/migrate-setup", {
            method: "POST",
            headers: { Authorization: `Bearer ${migrateToken}` },
          }).catch(() => {/* silent — non-critical */});
        }
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        console.error("Error fetching stats:", {
          status: error.status,
          message: error.message,
          data: error.data,
        });

        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        toast.error(error.message || "Failed to load dashboard stats");
      } else {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load dashboard stats");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await cachedApiGet<{ announcements: AnnouncementItem[] }>({
        key: `admin:announcements:${token.slice(-12)}`,
        url: "/api/announcements/list",
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 30_000,
      });
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  }, []);

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
    } catch {
      router.push("/login");
      return;
    }

    // Load top-section and announcements in parallel to reduce time-to-interactive.
    void Promise.allSettled([fetchStats(), fetchAnnouncements()]);
  }, [fetchAnnouncements, fetchStats, router]);

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
  }, [announcementForm, fetchAnnouncements]);

  const handleCompleteSetup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSetupSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/academic-years/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: setupForm.name,
          startDate: setupForm.startDate,
          endDate: setupForm.endDate,
          setAsActive: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to complete setup");
        return;
      }

      toast.success("Session and first term set successfully");
      setShowSetupModal(false);
      await fetchStats();
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to complete setup");
    } finally {
      setIsSetupSubmitting(false);
    }
  }, [setupForm, fetchStats]);

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
        description={`Manage ${schoolName}'s academic operations`}
      />

      <div className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard 
            title="Teachers" 
            value={stats.teachers} 
            icon={Users} 
            color="indigo"
          />
          <StatCard 
            title="Students" 
            value={stats.students} 
            icon={GraduationCap} 
            color="green"
          />
          <StatCard 
            title="Parents" 
            value={stats.parents} 
            icon={UsersRound} 
            color="purple"
          />
          <StatCard 
            title="Classes" 
            value={stats.classes} 
            icon={School} 
            color="blue"
          />
          <StatCard 
            title="Subjects" 
            value={stats.subjects} 
            icon={BookOpen} 
            color="orange"
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
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-linear-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
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
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-linear-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
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
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-linear-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
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
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-linear-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
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
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-linear-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
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
                className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left bg-linear-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-white"
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
                  <div className="text-xs text-gray-600 mt-0.5">
                    {activeTerm ? `${activeTerm.academicYear} - Term ${activeTerm.term}` : "Not configured yet"}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 text-white rounded-full text-xs font-semibold shadow-sm ${
                    activeTerm ? "bg-green-500" : "bg-amber-500"
                  }`}
                >
                  {activeTerm ? "Active" : "Setup Required"}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="font-medium text-gray-900 text-sm">Total Classes</div>
                  <div className="text-xs text-gray-600 mt-0.5">Creche – SS3 (customisable arms)</div>
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
                  <p className="text-xs text-gray-600 mt-0.5">SS3C has been set up</p>
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
                  <option value="ALL">School-wide</option>
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
          </>
        )}
      </div>

      <Modal
        isOpen={showSetupModal}
        onClose={() => {}}
        title="Complete School Setup"
      >
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Set your first academic session and active term to continue.
        </div>

        <form onSubmit={handleCompleteSetup} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Academic Session</label>
            <input
              type="text"
              required
              value={setupForm.name}
              onChange={(e) => setSetupForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 2025/2026"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Session Start Date</label>
              <input
                type="date"
                required
                value={setupForm.startDate}
                onChange={(e) => setSetupForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Session End Date</label>
              <input
                type="date"
                required
                value={setupForm.endDate}
                onChange={(e) => setSetupForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            The first term will be set as active automatically. You can switch terms later from Academic Years.
          </div>

          <button
            type="submit"
            disabled={isSetupSubmitting}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSetupSubmitting ? "Saving setup..." : "Save Session and Continue"}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
