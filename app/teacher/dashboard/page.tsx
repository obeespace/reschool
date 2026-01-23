"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { StatCard, PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

export default function TeacherDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(null);
  const [stats, setStats] = useState({
    myClasses: 0,
    myStudents: 0,
    scoresUploaded: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
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

      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setTeacher(userData);

      fetchAnnouncements();
      fetchMyClasses();

      // Simulate loading stats
      setTimeout(() => {
        setStats({
          myClasses: 3,
          myStudents: 45,
          scoresUploaded: 120,
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      router.push("/login");
    }
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
      <DashboardLayout role="TEACHER">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome back, ${teacher?.fullName || "Teacher"}!`}
      />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard title="My Classes" value={stats.myClasses} icon="🏫" color="indigo" />
          <StatCard title="My Students" value={stats.myStudents} icon="👨‍🎓" color="green" />
          <StatCard title="Scores Uploaded" value={stats.scoresUploaded} icon="📝" color="blue" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/teacher/students")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">👨‍🎓</div>
              <div className="font-semibold">Manage Students</div>
              <div className="text-sm text-gray-600">Add or view students in my class</div>
            </button>

            <button
              onClick={() => router.push("/teacher/scores")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold">Upload Scores</div>
              <div className="text-sm text-gray-600">Enter student scores for my subjects</div>
            </button>

            <button
              onClick={() => router.push("/teacher/classes")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">🏫</div>
              <div className="font-semibold">My Classes</div>
              <div className="text-sm text-gray-600">View classes I teach</div>
            </button>

            <button
              onClick={() => router.push("/teacher/profile")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold">My Profile</div>
              <div className="text-sm text-gray-600">View my teaching assignments</div>
            </button>
          </div>
        </div>

        {/* My Assignments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">My Assignments</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold mb-2">Class Teacher</div>
              <div className="text-sm text-gray-600">JSS 1A - 15 Students</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold mb-2">Mathematics Teacher</div>
              <div className="text-sm text-gray-600">JSS 1A, JSS 1B, JSS 1C</div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="font-semibold text-green-800 mb-1">👏 Keep it up!</div>
              <div className="text-sm text-green-700">You've uploaded scores for 80% of your students this term.</div>
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
              {showAnnouncementForm ? "Cancel" : "Create Class Announcement"}
            </button>
          </div>

          {showAnnouncementForm && (
            <form onSubmit={handleCreateAnnouncement} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Class</label>
                <select
                  required
                  value={announcementForm.classId}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, classId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select a class...</option>
                  {myClasses.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  placeholder="Enter message for parents in this class"
                />
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
                      {announcement.announcementType === "GENERAL" ? "General" : "Class"}
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
