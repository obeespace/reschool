"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { StatCard, PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

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

    fetchAnnouncements();

    // Simulate loading stats
    setTimeout(() => {
      setStats({
        teachers: 25,
        students: 450,
        parents: 380,
        classes: 18,
      });
      setIsLoading(false);
    }, 500);
  }, [router]);

  const fetchAnnouncements = async () => {
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
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
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
  };

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
        description="Manage your school's academic operations"
      />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Teachers" value={stats.teachers} icon="👨‍🏫" color="indigo" />
          <StatCard title="Students" value={stats.students} icon="👨‍🎓" color="green" />
          <StatCard title="Parents" value={stats.parents} icon="👪" color="yellow" />
          <StatCard title="Classes" value={stats.classes} icon="🏫" color="blue" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push("/admin/academic-years")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold">Manage Academic Years</div>
              <div className="text-sm text-gray-600">Create and manage sessions & terms</div>
            </button>

            <button
              onClick={() => router.push("/admin/subjects")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="font-semibold">Manage Subjects</div>
              <div className="text-sm text-gray-600">Add and configure subjects</div>
            </button>

            <button
              onClick={() => router.push("/admin/classes")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">🏫</div>
              <div className="font-semibold">Manage Classes</div>
              <div className="text-sm text-gray-600">Create classes and link subjects</div>
            </button>

            <button
              onClick={() => router.push("/admin/teachers")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">👨‍🏫</div>
              <div className="font-semibold">Manage Teachers</div>
              <div className="text-sm text-gray-600">Add teachers and assign classes</div>
            </button>

            <button
              onClick={() => router.push("/admin/students")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">👨‍🎓</div>
              <div className="font-semibold">View Students</div>
              <div className="text-sm text-gray-600">Monitor student records</div>
            </button>

            <button
              onClick={() => router.push("/admin/reports")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold">Reports</div>
              <div className="text-sm text-gray-600">View analytics and generate reports</div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">System Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Current Academic Year</div>
                <div className="text-sm text-gray-600">2024/2025 - First Term</div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Total Classes</div>
                <div className="text-sm text-gray-600">JSS1-3, SSS1-3 (A, B, C arms)</div>
              </div>
              <span className="text-2xl">18</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Subscription Status</div>
                <div className="text-sm text-gray-600">Valid until July 2026</div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Paid
              </span>
            </div>
          </div>
        </div>

        {/* Announcements Section */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">📢 Announcements</h2>
            <button
              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showAnnouncementForm ? "Cancel" : "Create Announcement"}
            </button>
          </div>

          {showAnnouncementForm && (
            <form onSubmit={handleCreateAnnouncement} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  required
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={4}
                  placeholder="Enter announcement message"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <select
                  value={announcementForm.targetAudience}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, targetAudience: e.target.value })}
                  className="w-full p-2 border rounded-lg"
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
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSubmitting ? "Creating..." : "Create Announcement"}
              </button>
            </form>
          )}

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No announcements yet</p>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {announcement.targetAudience.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{announcement.message}</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Posted by: {announcement.postedBy.name} ({announcement.postedBy.role})</span>
                    <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                  </div>
                  {announcement.className && (
                    <div className="mt-2 text-sm text-blue-600">Class: {announcement.className}</div>
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
