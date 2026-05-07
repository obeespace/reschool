"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

export default function TeacherAnnouncements() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    classId: "",
    title: "",
    message: ""
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
      if (payload.role !== "TEACHER") {
        router.push("/login");
        return;
      }
    } catch (error) {
      router.push("/login");
      return;
    }

    fetchAnnouncements();
    fetchMyClasses();
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
        
        // Mark all as read when viewing the page
        markAllAsRead(data.announcements);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMyClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const markAllAsRead = async (announcements: any[]) => {
    try {
      const token = localStorage.getItem("token");
      for (const announcement of announcements) {
        await fetch("/api/announcements/mark-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ announcementId: announcement.id }),
        });
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/announcements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(announcementForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Class announcement created successfully!");
        setAnnouncementForm({ classId: "", title: "", message: "" });
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
      <DashboardLayout role="TEACHER">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="Announcements"
        description="View school announcements and create class announcements"
      />

      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-xl font-bold">Announcements</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              {showCreateForm ? "Cancel" : "+ Create Class Announcement"}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateAnnouncement} className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-indigo-100">
              <h3 className="font-semibold text-lg mb-4">New Class Announcement</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Class *</label>
                <select
                  required
                  value={announcementForm.classId}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, classId: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a class...</option>
                  {myClasses.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">This announcement will be visible to parents of students in this class</p>
              </div>

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

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Message *</label>
                <textarea
                  required
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter message for parents in this class"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
                >
                  {isSubmitting ? "Creating..." : "Create Announcement"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 block mb-4 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 text-lg">No announcements yet</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 sm:p-6 border border-gray-200 rounded-xl hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <span className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                      {announcement.announcementType === "GENERAL" ? "General" : "Class"}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-gray-500 pt-3 border-t">
                    <span>
                      Posted by: <span className="font-medium">{announcement.postedBy.name}</span> 
                      <span className="text-gray-400"> ({announcement.postedBy.role})</span>
                    </span>
                    <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                  </div>
                  {announcement.className && (
                    <div className="mt-3 text-sm text-blue-600 font-medium">
                      Class: {announcement.className}
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
