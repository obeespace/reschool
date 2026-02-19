"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Users, FileText } from "lucide-react";
import DashboardLayout from "@/app/components/Sidebar";
import { StatCard, PageHeader, LoadingSpinner } from "@/app/components/UIComponents";
import { cachedApiGet } from "@/app/utils/clientCache";

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
  const [assignments, setAssignments] = useState<any>(null);
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
      fetchDashboard();
    } catch (error) {
      router.push("/login");
    }
  }, [router]);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await cachedApiGet<{ announcements: any[] }>({
        key: `teacher:announcements:${token.slice(-12)}`,
        url: "/api/announcements/list",
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 30_000,
      });
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await cachedApiGet<{ stats: typeof stats; assignments: any; classes: any[] }>({
        key: `teacher:dashboard:${token.slice(-12)}`,
        url: "/api/teachers/dashboard",
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 60_000,
      });
      setStats(data.stats);
      setAssignments(data.assignments);
      setMyClasses(data.classes || []);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
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
          <StatCard title="My Classes" value={stats.myClasses} icon={Building2} color="indigo" />
          <StatCard title="My Students" value={stats.myStudents} icon={Users} color="green" />
          <StatCard title="Scores Uploaded" value={stats.scoresUploaded} icon={FileText} color="blue" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/teacher/students")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="w-8 h-8 mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="font-semibold">Manage Students</div>
              <div className="text-sm text-gray-600">Add or view students in my class</div>
            </button>

            <button
              onClick={() => router.push("/teacher/scores")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="w-8 h-8 mb-2 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="font-semibold">Upload Scores</div>
              <div className="text-sm text-gray-600">Enter student scores for my subjects</div>
            </button>

            <button
              onClick={() => router.push("/teacher/classes")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="w-8 h-8 mb-2 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="font-semibold">My Classes</div>
              <div className="text-sm text-gray-600">View classes I teach</div>
            </button>

            <button
              onClick={() => router.push("/teacher/profile")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="w-8 h-8 mb-2 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="font-semibold">My Profile</div>
              <div className="text-sm text-gray-600">View my teaching assignments</div>
            </button>
          </div>
        </div>

        {/* My Assignments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">My Assignments</h2>
          <div className="space-y-4">
            {assignments?.classTeacherOf ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold mb-2">Class Teacher</div>
                <div className="text-sm text-gray-600">
                  {assignments.classTeacherOf.name} - {assignments.classTeacherOf.studentCount} Students
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold mb-2">Class Teacher</div>
                <div className="text-sm text-gray-600">Not assigned</div>
              </div>
            )}

            {assignments?.subjectsAndClasses?.length ? (
              assignments.subjectsAndClasses.map((entry: any) => (
                <div key={entry.subject?._id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold mb-2">{entry.subject?.name || "Subject"} Teacher</div>
                  <div className="text-sm text-gray-600">
                    {entry.classes?.length
                      ? entry.classes.map((cls: any) => cls.name).join(", ")
                      : "No assigned classes"}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold mb-2">Subject Assignments</div>
                <div className="text-sm text-gray-600">No subject assignments yet</div>
              </div>
            )}

            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="font-semibold text-green-800 mb-1">Keep it up!</div>
              <div className="text-sm text-green-700">You've uploaded scores for 80% of your students this term.</div>
            </div>
          </div>
        </div>

        {/* Announcements Section */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Announcements</h2>
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
