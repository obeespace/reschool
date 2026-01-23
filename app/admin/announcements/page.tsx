"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

export default function AdminAnnouncements() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
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
        setShowCreateForm(false);
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
        title="📢 Announcements"
        description="Create and manage school-wide announcements"
      />

      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">All Announcements</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              {showCreateForm ? "Cancel" : "+ Create Announcement"}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateAnnouncement} className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-100">
              <h3 className="font-semibold text-lg mb-4">New Announcement</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message *</label>
                <textarea
                  required
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter announcement message"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Target Audience *</label>
                <select
                  value={announcementForm.targetAudience}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, targetAudience: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="ALL">All (Teachers & Parents)</option>
                  <option value="TEACHERS_AND_PARENTS">Teachers and Parents</option>
                  <option value="TEACHERS_ONLY">Teachers Only</option>
                  <option value="PARENTS_ONLY">Parents Only</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
                >
                  {isSubmitting ? "Creating..." : "Create Announcement"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl block mb-4">📭</span>
                <p className="text-gray-500 text-lg">No announcements yet</p>
                <p className="text-gray-400 text-sm mt-2">Create your first announcement to get started</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-6 border-2 rounded-lg hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <div className="flex gap-2">
                      <span className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                        {announcement.targetAudience.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                        {announcement.announcementType === "GENERAL" ? "General" : "Class"}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t">
                    <span>
                      Posted by: <span className="font-medium">{announcement.postedBy.name}</span> 
                      <span className="text-gray-400"> ({announcement.postedBy.role})</span>
                    </span>
                    <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                  </div>
                  {announcement.className && (
                    <div className="mt-3 text-sm text-blue-600 font-medium">
                      📚 Class: {announcement.className}
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
