"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader } from "@/app/components/UIComponents";

export default function TeacherProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "TEACHER") {
      router.push("/login");
      return;
    }

    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      const response = await fetch("/api/teachers/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...data, email: user.email, fullName: user.fullName });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="My Profile"
        description="View your teaching assignments and profile information"
      />

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
            <p className="text-gray-900">{profile?.fullName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <p className="text-gray-900">{profile?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Class Teacher Assignment */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Class Teacher Assignment</h2>
        </div>
        <div className="p-6">
          {profile?.classTeacherOf ? (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📚</span>
                <div>
                  <p className="text-sm opacity-90">You are the class teacher of</p>
                  <p className="text-2xl font-bold">
                    {profile.classTeacherOf.level} {profile.classTeacherOf.arm}
                  </p>
                </div>
              </div>
              <p className="text-sm opacity-90 mt-2">
                You can add and manage students for this class
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              <p>Not assigned as a class teacher</p>
              <p className="text-sm mt-1">Contact your administrator for class teacher assignments</p>
            </div>
          )}
        </div>
      </div>

      {/* Subject Assignments */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Subject Assignments</h2>
        </div>
        <div className="p-6">
          {profile?.subjectsAndClasses && profile.subjectsAndClasses.length > 0 ? (
            <div className="space-y-4">
              {profile.subjectsAndClasses.map((assignment: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {assignment.subjectId?.name || 'Unknown Subject'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {assignment.classIds?.map((classInfo: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                          >
                            {classInfo.level} {classInfo.arm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 text-2xl font-bold">
                    {profile.subjectsAndClasses.length}
                  </div>
                  <div className="text-sm text-blue-800">Total Subjects</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 text-2xl font-bold">
                    {profile.subjectsAndClasses.reduce((sum: number, a: any) => 
                      sum + (a.classIds?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-green-800">Total Classes Teaching</div>
                </div>

                {profile?.classTeacherOf && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 text-2xl font-bold">1</div>
                    <div className="text-sm text-purple-800">Class Teacher Role</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              <p>No subject assignments yet</p>
              <p className="text-sm mt-1">Contact your administrator to assign subjects to you</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
