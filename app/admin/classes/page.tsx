"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable, Modal, Button, Select } from "@/app/components/UIComponents";

interface Class {
  _id: string;
  name?: string;
  level: string;
  arm: string;
  subjectIds?: any[];
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    level: "",
    arm: "",
  });

  const levels = ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"];
  const arms = ["A", "B", "C"];

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes);
      } else {
        toast.error("Failed to load classes");
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.level || !formData.arm) {
      toast.error("Please select both level and arm");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/classes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Class ${data.className} created successfully!`);
        setShowModal(false);
        setFormData({ level: "", arm: "" });
        fetchClasses();
      } else {
        toast.error(data.error || "Failed to create class");
      }
    } catch (error) {
      toast.error("Failed to create class");
    }
  };

  const columns = [
    { 
      header: "Class", 
      accessor: "level" as keyof Class,
      render: (value: any, row: Class) => `${value} ${row.arm}`
    },
    { 
      header: "Number of Subjects", 
      accessor: "subjectIds" as keyof Class,
      render: (value: any) => Array.isArray(value) ? value.length : 0
    },
    {
      header: "Actions",
      accessor: "_id" as keyof Class,
      render: (value: any) => (
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/admin/classes/${value}`)}
            variant="secondary"
            size="sm"
          >
            View Details
          </Button>
        </div>
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
        title="Classes"
        description="Manage classes for your school (JSS1-SSS3)"
        action={
          <Button onClick={() => setShowModal(true)}>
            + Add Class
          </Button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        {classes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No classes created yet</p>
            <p className="text-sm">Click "+ Add Class" to create your first class</p>
          </div>
        ) : (
          <DataTable data={classes} columns={columns} />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Class"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Level"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            options={[
              { value: "", label: "Select Level" },
              ...levels.map(level => ({ value: level, label: level }))
            ]}
            required
          />
          
          <Select
            label="Arm"
            value={formData.arm}
            onChange={(e) => setFormData({ ...formData, arm: e.target.value })}
            options={[
              { value: "", label: "Select Arm" },
              ...arms.map(arm => ({ value: arm, label: `Arm ${arm}` }))
            ]}
            required
          />

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            <p><strong>Note:</strong> After creating a class, you can assign subjects and a class teacher to it.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Create</Button>
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
