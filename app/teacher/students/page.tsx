"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable, Modal, Button, Input, Select } from "@/app/components/UIComponents";

interface Student {
  id: string;
  fullName: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: string;
}

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    admissionNumber: "",
    dateOfBirth: "",
    gender: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "TEACHER") {
      router.push("/login");
      return;
    }

    loadTeacherStudents();
  }, []);

  const loadTeacherStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teachers/students", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.classTeacherOf) {
          setIsClassTeacher(true);
          setClassInfo(data.classTeacherOf);
          setStudents(data.students || []);
        } else {
          setIsClassTeacher(false);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to load students");
      }
    } catch (error) {
      console.error("Failed to fetch teacher students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.admissionNumber) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!isClassTeacher || !classInfo) {
      toast.error("You must be a class teacher to add students");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          currentClassId: classInfo._id,
        }),
      });

      if (response.ok) {
        toast.success("Student added successfully!");
        setShowModal(false);
        setFormData({ fullName: "", admissionNumber: "", dateOfBirth: "", gender: "" });
        loadTeacherStudents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add student");
      }
    } catch (error) {
      toast.error("Failed to add student");
    }
  };

  const columns = [
    { header: "Admission Number", accessor: "admissionNumber" as keyof Student },
    { header: "Full Name", accessor: "fullName" as keyof Student },
    { 
      header: "Date of Birth", 
      accessor: "dateOfBirth" as keyof Student,
      render: (value: any) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    { header: "Gender", accessor: "gender" as keyof Student }
  ];

  if (loading) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isClassTeacher) {
    return (
      <DashboardLayout role="TEACHER">
        <PageHeader
          title="Students"
          description="Manage students in your class"
        />
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 mb-4 bg-yellow-200 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Class Teacher Access Required
          </h3>
          <p className="text-yellow-800">
            Only class teachers can add students to their assigned class.
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Please contact your administrator to be assigned as a class teacher.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="Students"
        description={`Manage students in ${classInfo?.level} ${classInfo?.arm}`}
        action={
          <Button onClick={() => setShowModal(true)}>
            + Add Student
          </Button>
        }
      />

      <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-1">Your Class</h3>
        <p className="text-2xl font-bold">{classInfo?.level} {classInfo?.arm}</p>
        <p className="text-sm mt-2 opacity-90">
          {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No students enrolled yet</p>
            <p className="text-sm">Click "+ Add Student" to add your first student</p>
          </div>
        ) : (
          <DataTable data={students} columns={columns} />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Student"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="e.g., Chukwuemeka Obi"
            required
          />
          
          <Input
            label="Admission Number"
            type="text"
            value={formData.admissionNumber}
            onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
            placeholder="e.g., 2024/JSS1/001"
            required
          />
          
          <Input
            label="Date of Birth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          />

          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            options={[
              { value: "", label: "Select Gender" },
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" }
            ]}
          />

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            <p><strong>Note:</strong> Student will be added to {classInfo?.level} {classInfo?.arm}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Add Student</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
