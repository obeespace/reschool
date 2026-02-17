"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader } from "@/app/components/UIComponents";

export default function TeacherProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState<{ type: string; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

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
      
      // Set basic profile from localStorage immediately
      let profileData = { ...user };
      
      try {
        const response = await fetch("/api/teachers/assignments", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          profileData = { ...profileData, ...data };
        }
      } catch (apiError) {
        console.error("Failed to fetch assignments:", apiError);
        // Continue with user data from localStorage
      }
      
      setProfile(profileData);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      // Fallback to localStorage data
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setProfile(user);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "All fields are required" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage({ type: "success", text: "Password changed successfully!" });
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setShowPasswordForm(false), 1500);
      } else {
        const error = await response.json();
        setPasswordMessage({ type: "error", text: error.error || "Failed to change password" });
      }
    } catch (error: any) {
      setPasswordMessage({ type: "error", text: error.message || "An error occurred" });
    } finally {
      setPasswordLoading(false);
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
            <p className="text-gray-900 font-semibold">{profile?.fullName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <p className="text-gray-900 font-semibold">{profile?.email || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium w-fit">
              Teacher
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium w-fit">
              {profile?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <div className="p-6">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {passwordMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    passwordMessage.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {passwordMessage.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
                    setPasswordMessage(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Class Teacher Assignment */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Class Teacher Assignment</h2>
        </div>
        <div className="p-6">
          {profile?.classTeacherOf ? (
            <div className="bg-linear-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
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
