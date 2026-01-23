"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button } from "@/app/components/UIComponents";

interface Ward {
  id: string;
  fullName: string;
  admissionNumber: string;
  currentClass: {
    level: string;
    arm: string;
  };
  dateOfBirth: string;
  gender: string;
  averageScore?: number;
  totalSubjects?: number;
}

export default function ParentWardsPage() {
  const router = useRouter();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "PARENT") {
      router.push("/login");
      return;
    }

    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/parents/ward-scores", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWards(data.wards || []);
      }
    } catch (error) {
      console.error("Failed to fetch wards:", error);
    } finally {
      setLoading(false);
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
        title="My Wards"
        description="View detailed information about your children"
      />

      {wards.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="mb-2">No wards assigned to your account</p>
          <p className="text-sm">Contact the school administrator to link your children to your account</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wards.map((ward) => (
            <div key={ward.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Ward Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{ward.fullName}</h3>
                    <p className="text-sm opacity-90">
                      {ward.currentClass?.level} {ward.currentClass?.arm}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Admission No.</p>
                    <p className="font-semibold">{ward.admissionNumber}</p>
                  </div>
                </div>
              </div>

              {/* Ward Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Date of Birth
                    </label>
                    <p className="text-gray-900">
                      {ward.dateOfBirth ? new Date(ward.dateOfBirth).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Gender
                    </label>
                    <p className="text-gray-900">{ward.gender || 'N/A'}</p>
                  </div>
                </div>

                {/* Academic Summary */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Academic Summary</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">Average Score</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {ward.averageScore ? `${ward.averageScore.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600 mb-1">Total Subjects</p>
                      <p className="text-2xl font-bold text-green-900">
                        {ward.totalSubjects || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-2">
                  <Button
                    onClick={() => router.push(`/parent/scores?student=${ward.id}`)}
                    className="flex-1"
                  >
                    View Scores
                  </Button>
                  <Button
                    onClick={() => router.push(`/parent/scores?student=${ward.id}`)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Performance
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {wards.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-indigo-600 text-3xl font-bold">{wards.length}</div>
            <div className="text-sm text-gray-600">Total Wards</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-green-600 text-3xl font-bold">
              {wards.reduce((sum, w) => sum + (w.totalSubjects || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Subjects</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-blue-600 text-3xl font-bold">
              {wards.length > 0 
                ? (wards.reduce((sum, w) => sum + (w.averageScore || 0), 0) / wards.length).toFixed(1)
                : '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Overall Average</div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📌 Parental Tips</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Review your ward's performance regularly</li>
          <li>• Encourage strong performance in weak subjects</li>
          <li>• Communicate with class teachers when needed</li>
          <li>• Celebrate academic achievements</li>
          <li>• Support homework and exam preparation</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
