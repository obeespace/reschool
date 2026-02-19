"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, FileText } from "lucide-react";
import DashboardLayout from "@/app/components/Sidebar";
import { StatCard, PageHeader, LoadingSpinner } from "@/app/components/UIComponents";
import { cachedApiGet } from "@/app/utils/clientCache";

export default function ParentDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [parent, setParent] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({
    wardsCount: 0,
    activeTerm: "N/A",
    reportsAvailable: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "PARENT") {
        router.push("/login");
        return;
      }

      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setParent(userData);

      fetchDashboard();
      fetchAnnouncements();
    } catch (error) {
      router.push("/login");
    }
  }, [router]);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await cachedApiGet<{ wards: any[]; stats: typeof stats }>({
        key: `parent:dashboard:${token.slice(-12)}`,
        url: "/api/parents/dashboard",
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 60_000,
      });
      setWards(data.wards || []);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching parent dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await cachedApiGet<{ announcements: any[] }>({
        key: `parent:announcements:${token.slice(-12)}`,
        url: "/api/announcements/list",
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 30_000,
      });
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="PARENT">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="PARENT">
      <PageHeader
        title="Parent Dashboard"
        description={`Welcome, ${parent?.fullName || "Parent"}!`}
      />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard title="My Wards" value={stats.wardsCount} icon={Users} color="indigo" />
          <StatCard title="Active Term" value={stats.activeTerm} icon={Calendar} color="blue" />
          <StatCard title="Reports Available" value={stats.reportsAvailable} icon={FileText} color="green" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/parent/wards")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="w-8 h-8 mb-2 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="font-semibold">My Wards</div>
              <div className="text-sm text-gray-600">View my children's profiles</div>
            </button>

            <button
              onClick={() => router.push("/parent/scores")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="w-8 h-8 mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="font-semibold">View Scores</div>
              <div className="text-sm text-gray-600">Check academic performance</div>
            </button>
          </div>
        </div>

        {/* My Wards */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">My Wards</h2>
          {wards.length > 0 ? (
            <div className="space-y-4">
              {wards.map((ward: any) => (
                <div key={ward._id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-lg">{ward.fullName}</div>
                    <div className="text-sm text-gray-600">
                      {ward.currentClassId?.level} {ward.currentClassId?.arm}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/parent/scores?student=${ward._id}`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    View Scores
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No wards found.</p>
              <p className="text-sm mt-2">Please contact the school administrator.</p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-900 mb-2">Tip</h3>
          <p className="text-blue-800 text-sm">
            You can monitor your ward's academic progress in real-time. Check the scores section regularly to stay updated with their performance.
          </p>
        </div>

        {/* Announcements Section */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">Announcements</h2>
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
