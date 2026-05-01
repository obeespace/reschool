"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { DataTable } from "@/app/components/UIComponents";
import { ChevronLeft } from "lucide-react";

interface Ward {
  id: string;
  fullName: string;
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: string;
  className: string;
}

interface ParentDetails {
  id: string;
  fullName: string;
  email: string;
}

export default function ParentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const parentId = params.id as string;
  
  const [parent, setParent] = useState<ParentDetails | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"ADMIN" | "TEACHER" | "PARENT">("ADMIN");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    setUserRole(user.role);
    fetchParentDetails();
  }, [parentId]);

  const fetchParentDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/parents/details?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setParent(data.parent);
        setWards(data.wards || []);
      } else if (response.status === 404) {
        toast.error("Parent not found");
        router.push("/admin/parents");
      }
    } catch (error) {
      console.error("Failed to fetch parent details:", error);
      toast.error("Failed to load parent details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role={userRole}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!parent) {
    return (
      <DashboardLayout role={userRole}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Parent not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const wardColumns = [
    { header: "Full Name", accessor: "fullName" as const },
    { header: "Admission Number", accessor: "admissionNumber" as const },
    { header: "Gender", accessor: "gender" as const },
    { header: "Class", accessor: "className" as const },
  ];

  return (
    <DashboardLayout role={userRole}>
      <div className="flex-1 p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-indigo-600 mb-6 hover:text-indigo-700"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        {/* Parent Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {parent.fullName}
          </h1>
          <p className="text-gray-600 mb-4">Email: {parent.email}</p>
          <div className="flex gap-4">
            <span className="text-lg font-semibold text-indigo-600">
              {wards.length} Ward{wards.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Wards Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Children/Wards</h2>
          </div>
          {wards.length > 0 ? (
            <DataTable columns={wardColumns} data={wards} />
          ) : (
            <div className="p-6 text-center text-gray-500">
              No wards assigned yet
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
