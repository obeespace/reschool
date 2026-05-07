"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

export default function ParentAnnouncements() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);

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

  if (isLoading) {
    return (
      <DashboardLayout role="PARENT">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const generalAnnouncements = announcements.filter(a => a.announcementType === "GENERAL");
  const classAnnouncements = announcements.filter(a => a.announcementType === "CLASS_SPECIFIC");

  return (
    <DashboardLayout role="PARENT">
      <PageHeader
        title="Announcements"
        description="Stay updated with school and class announcements"
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Class Announcements Section */}
        {classAnnouncements.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="text-xl font-bold">Class Announcements</h2>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {classAnnouncements.length}
              </span>
            </div>

            <div className="space-y-4">
              {classAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-4 sm:p-6 border border-blue-100 rounded-xl hover:shadow-md transition bg-blue-50/30">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium whitespace-nowrap">
                      {announcement.className}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-gray-500 pt-3 border-t border-blue-200">
                    <span>
                      Teacher: <span className="font-medium">{announcement.postedBy.name}</span>
                    </span>
                    <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Announcements Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <h2 className="text-xl font-bold">General Announcements</h2>
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              {generalAnnouncements.length}
            </span>
          </div>

          <div className="space-y-4">
            {generalAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 block mb-4 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 text-lg">No general announcements yet</p>
              </div>
            ) : (
              generalAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-4 sm:p-6 border border-gray-200 rounded-xl hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <span className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                      School
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
                </div>
              ))
            )}
          </div>
        </div>

        {announcements.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl block mb-4">📭</span>
            <p className="text-gray-500 text-lg">No announcements yet</p>
            <p className="text-gray-400 text-sm mt-2">Check back later for updates from the school</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
