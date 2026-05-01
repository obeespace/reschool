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
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    admissionNumber: "",
    classId: "",
    dateOfBirth: "",
    gender: "",
    parentFullName: "",
    parentEmail: "",
    parentPhone: "",
    parentPassword: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
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

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.admissionNumber || !formData.classId) {
      toast.error("Please fill student name, admission number and class");
      return;
    }

    if (!formData.parentEmail && !formData.parentPhone) {
      toast.error("Provide guardian email or phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          admissionNumber: formData.admissionNumber,
          classId: formData.classId,
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          parentFullName: formData.parentFullName || undefined,
          parentEmail: formData.parentEmail || undefined,
          parentPhone: formData.parentPhone || undefined,
          parentPassword: formData.parentPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create student");
        return;
      }

      toast.success(data.temporaryParentPassword
        ? `Student created. Temporary guardian password: ${data.temporaryParentPassword}`
        : "Student created successfully"
      );

      setFormData({
        fullName: "",
        admissionNumber: "",
        classId: "",
        dateOfBirth: "",
        gender: "",
        parentFullName: "",
        parentEmail: "",
        parentPhone: "",
        parentPassword: "",
      });
      setShowModal(false);
      fetchStudents();
    } catch (error) {
      console.error("Create student error:", error);
      toast.error("Failed to create student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: "Admission Number", accessor: "admissionNumber" as keyof Student },
    { header: "Full Name", accessor: "fullName" as keyof Student },
    {
      header: "Current Class",
      accessor: "currentClass" as keyof Student,
      render: (value: any) => value ? `${value.level} ${value.arm}` : "Not assigned"
    },
    {
      header: "Gender",
      accessor: "gender" as keyof Student,
      render: (value: any) => value || "N/A"
    },
    {
      header: "Date of Birth",
      accessor: "dateOfBirth" as keyof Student,
      render: (value: any) => value ? new Date(value).toLocaleDateString() : "N/A"
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
        description="Manage student enrollment and guardian linking"
        action={<Button onClick={() => setShowModal(true)}>+ Add Student</Button>}
      />

      <div className="bg-white rounded-lg shadow">
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No students enrolled yet</p>
            <p className="text-sm">Use "+ Add Student" to enroll first student</p>
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Student"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <Input
            label="Student Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />

          <Input
            label="Admission Number"
            value={formData.admissionNumber}
            onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
            required
          />

          <Select
            label="Class"
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            options={[
              { value: "", label: "Select Class" },
              ...classes.map((classItem: any) => ({
                value: classItem._id,
                label: `${classItem.level} ${classItem.arm}`
              }))
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <h3 className="font-semibold text-gray-900">Guardian Information</h3>
            <p className="text-xs text-gray-600">
              If guardian email/phone matches an existing guardian in this school, student is linked automatically.
              Otherwise, a new guardian account is created.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Guardian Email"
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
              />
              <Input
                label="Guardian Phone"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
              />
            </div>

            <Input
              label="Guardian Full Name (for new account)"
              value={formData.parentFullName}
              onChange={(e) => setFormData({ ...formData, parentFullName: e.target.value })}
            />

            <Input
              label="Guardian Password (optional for new account)"
              type="text"
              value={formData.parentPassword}
              onChange={(e) => setFormData({ ...formData, parentPassword: e.target.value })}
              placeholder="Leave blank to auto-generate"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Student"}
            </Button>
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
