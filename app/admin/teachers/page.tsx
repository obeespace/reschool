"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable, Modal, Button, Input, Select } from "@/app/components/UIComponents";

interface Teacher {
  _id: string;
  fullName: string;
  email: string;
  classTeacherOf?: {
    _id: string;
    level: string;
    arm: string;
    name: string;
  } | null;
  subjectsAndClasses?: Array<{ subjectId: { _id: string; name: string }; classIds: Array<{ _id: string; name: string }> }>;
}

interface Class {
  _id: string;
  level: string;
  arm: string;
  name?: string;
}

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    classTeacherOf: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchTeachers();
    fetchClasses();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teachers/list", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
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
        console.log("Fetched classes:", data.classes);
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teachers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          classTeacherOf: formData.classTeacherOf || undefined,
          subjectsAndClasses: [] // Can be extended later
        }),
      });

      if (response.ok) {
        toast.success("Teacher created successfully!");
        setShowModal(false);
        setFormData({ fullName: "", email: "", password: "", classTeacherOf: "" });
        fetchTeachers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create teacher");
      }
    } catch (error) {
      toast.error("Failed to create teacher");
    }
  };

  const columns = [
    { header: "Full Name", accessor: "fullName" as keyof Teacher },
    { header: "Email", accessor: "email" as keyof Teacher },
    { 
      header: "Class Teacher", 
      accessor: "classTeacherOf" as keyof Teacher,
      render: (value: any) => value?.name || <span className="text-slate-400 text-xs italic">Not assigned</span>
    },
    { 
      header: "Subjects Teaching", 
      accessor: "subjectsAndClasses" as keyof Teacher,
      render: (value: any) => `${value?.length || 0} subject${value?.length !== 1 ? "s" : ""}`
    },
    {
      header: "Actions",
      accessor: "_id" as keyof Teacher,
      render: (value: any) => (
        <Button
          onClick={() => router.push(`/admin/teachers/${value}`)}
          variant="secondary"
          size="sm"
        >
          View Profile
        </Button>
      )
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
        title="Teachers"
        description="Manage teaching staff and their assignments"
        action={
          <Button onClick={() => {
            setShowModal(true);
            // Refresh classes when opening modal
            fetchClasses();
          }}>
            + Add Teacher
          </Button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        {teachers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No teachers added yet</p>
            <p className="text-sm">Click "+ Add Teacher" to create the first teacher account</p>
          </div>
        ) : (
          <DataTable data={teachers} columns={columns} />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Teacher Account"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Debug info */}
          {classes.length === 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
              ⚠️ No classes found — create classes first in the Classes section.
            </div>
          )}
          <Input
            label="Full Name"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="e.g., Mr. Adebayo Okonkwo"
            required
          />
          
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="teacher@school.com"
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 6 characters"
            required
          />

          <Select
            label="Assign as Class Teacher (Optional)"
            value={formData.classTeacherOf}
            onChange={(e) => setFormData({ ...formData, classTeacherOf: e.target.value })}
            options={[
              { value: "", label: "Not a class teacher" },
              ...classes.map(cls => ({ 
                value: cls._id, 
                label: cls.name || `${cls.level} ${cls.arm}` 
              }))
            ]}
          />

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            <p><strong>Note:</strong> You can assign subjects to this teacher after creation.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Create Teacher</Button>
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
