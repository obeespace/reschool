"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader } from "@/app/components/UIComponents";

export default function ParentProfilePage() {
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
    
    if (!token || user.role !== "PARENT") {
      router.push("/login");
      return;
    }

    // Set basic profile from localStorage
    setProfile(user);
    
    // Try to fetch additional parent info
    fetchParentInfo(token);
  }, [router]);

  const fetchParentInfo = async (token: string) => {
    try {
      const response = await fetch("/api/parents/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setProfile((prev: any) => ({ ...prev, ...data, ...user }));
      }
    } catch (error) {
      console.error("Failed to fetch parent info:", error);
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
      <DashboardLayout role="PARENT">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="PARENT">
      <PageHeader
        title="My Profile"
        description="View your profile information and manage your account"
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
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium w-fit">
              Parent
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

      {/* Wards Information */}
      {profile?.wards && profile.wards.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">My Wards ({profile.wards.length})</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.wards.map((ward: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                <p className="font-semibold text-gray-900">{ward.fullName || ward.name || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-1">Admission: {ward.admissionNumber || 'N/A'}</p>
                {ward.currentClassId && (
                  <p className="text-sm text-gray-600">Class: {ward.currentClassId.level} {ward.currentClassId.arm}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
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
    </DashboardLayout>
  );
}
