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
        title="📢 Announcements"
        description="Stay updated with school and class announcements"
      />

      <div className="p-6 space-y-6">
        {/* Class Announcements Section */}
        {classAnnouncements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📚</span>
              <h2 className="text-xl font-bold">Class Announcements</h2>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {classAnnouncements.length}
              </span>
            </div>

            <div className="space-y-4">
              {classAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-6 border-2 border-blue-100 rounded-lg hover:shadow-md transition bg-blue-50/30">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium whitespace-nowrap">
                      {announcement.className}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-blue-200">
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📢</span>
            <h2 className="text-xl font-bold">General Announcements</h2>
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              {generalAnnouncements.length}
            </span>
          </div>

          <div className="space-y-4">
            {generalAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl block mb-4">📭</span>
                <p className="text-gray-500 text-lg">No general announcements yet</p>
              </div>
            ) : (
              generalAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-6 border-2 rounded-lg hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <span className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                      School
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t">
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
