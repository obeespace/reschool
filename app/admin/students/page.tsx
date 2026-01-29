"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable } from "@/app/components/UIComponents";

interface Student {
  id: string;
  fullName: string;
  admissionNumber: string;
  currentClass: {
    level: string;
    arm: string;
  };
  dateOfBirth: string;
  gender: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      // Note: We'll need to create this API endpoint
      const response = await fetch("/api/students/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      } else {
        console.error("Failed to fetch students");
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Admission Number", accessor: "admissionNumber" as keyof Student },
    { header: "Full Name", accessor: "fullName" as keyof Student },
    { 
      header: "Current Class", 
      accessor: "currentClass" as keyof Student,
      render: (value: any) => value ? `${value.level} ${value.arm}` : 'Not assigned'
    },
    { 
      header: "Gender", 
      accessor: "gender" as keyof Student,
      render: (value: any) => value || 'N/A'
    },
    { 
      header: "Date of Birth", 
      accessor: "dateOfBirth" as keyof Student,
      render: (value: any) => value ? new Date(value).toLocaleDateString() : 'N/A'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="ADMIN">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Students"
        description="View all students in your school"
      />

      <div className="bg-white rounded-lg shadow">
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No students enrolled yet</p>
            <p className="text-sm">Teachers can add students to their classes</p>
            <p className="text-xs mt-2 text-blue-600">
              Note: Only class teachers can add students to their assigned class
            </p>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>
            </div>
            <DataTable data={students} columns={columns} />
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How to Add Students</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Assign a teacher as a class teacher for a class</li>
          <li>• That teacher can then add students to their class</li>
          <li>• All students will appear in this list once added</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
