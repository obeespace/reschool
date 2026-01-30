"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable, Modal, Button, Input, Select } from "@/app/components/UIComponents";

interface Parent {
  id: string;
  fullName: string;
  email: string;
  wardCount: number;
}

interface Student {
  id: string;
  fullName: string;
  admissionNumber: string;
}

export default function ParentsPage() {
  const router = useRouter();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    wardIds: [] as string[],
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchParents();
    fetchStudents();
  }, []);

  const fetchParents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/parents/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setParents(data.parents || []);
      }
    } catch (error) {
      console.error("Failed to fetch parents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    // Ward selection is optional - parent can be created without wards

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: "PARENT",
          wardIds: formData.wardIds
        }),
      });

      if (response.ok) {
        toast.success("Parent account created successfully!");
        setShowModal(false);
        setFormData({ fullName: "", email: "", password: "", wardIds: [] });
        fetchParents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create parent account");
      }
    } catch (error) {
      toast.error("Failed to create parent account");
    }
  };

  const handleWardSelection = (studentId: string) => {
    setFormData(prev => {
      const wardIds = prev.wardIds.includes(studentId)
        ? prev.wardIds.filter(id => id !== studentId)
        : [...prev.wardIds, studentId];
      return { ...prev, wardIds };
    });
  };

  const columns = [
    { header: "Full Name", accessor: "fullName" as keyof Parent },
    { header: "Email", accessor: "email" as keyof Parent },
    { 
      header: "Number of Wards", 
      accessor: "wardCount" as keyof Parent,
      render: (value: any) => `${value || 0} ${value === 1 ? 'ward' : 'wards'}`
    },
    {
      header: "Actions",
      accessor: "id" as keyof Parent,
      render: (value: any) => (
        <Button
          onClick={() => router.push(`/admin/parents/${value}`)}
          variant="secondary"
          size="sm"
        >
          View Details
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
        title="Parents"
        description="Manage parent accounts and their wards"
        action={
          <Button onClick={() => setShowModal(true)}>
            + Add Parent
          </Button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        {parents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No parent accounts created yet</p>
            <p className="text-sm">Click "+ Add Parent" to create the first parent account</p>
          </div>
        ) : (
          <DataTable data={parents} columns={columns} />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Parent Account"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Parent Full Name"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="e.g., Mrs. Chioma Nwosu"
            required
          />
          
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="parent@email.com"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Wards (Children)
            </label>
            {students.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                No students available. Please add students first.
              </p>
            ) : (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {students.map(student => (
                  <label
                    key={student.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.wardIds.includes(student.id)}
                      onChange={() => handleWardSelection(student.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm">
                      {student.fullName} ({student.admissionNumber})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            <p><strong>Note:</strong> Parents can view scores and information for their selected wards only.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Create Parent</Button>
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
