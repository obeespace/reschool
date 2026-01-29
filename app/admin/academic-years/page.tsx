"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable, Modal, Button, Input } from "@/app/components/UIComponents";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  term: number;
}

export default function AcademicYearsPage() {
  const router = useRouter();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    setAsActive: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/academic-years/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAcademicYears(data.academicYears);
      }
    } catch (error) {
      console.error("Failed to fetch academic years:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/academic-years/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Academic year created successfully!");
        setShowModal(false);
        setFormData({ name: "", startDate: "", endDate: "", setAsActive: false });
        fetchAcademicYears();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create academic year");
      }
    } catch (error) {
      toast.error("Failed to create academic year");
    }
  };

  const handleSetActive = async (yearId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/academic-years/set-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ academicYearId: yearId }),
      });

      if (response.ok) {
        toast.success("Academic year activated successfully!");
        fetchAcademicYears();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to activate academic year");
      }
    } catch (error) {
      toast.error("Failed to activate academic year");
    }
  };

  const columns = [
    { header: "Academic Year", accessor: "name" as keyof AcademicYear },
    { 
      header: "Start Date", 
      accessor: "startDate" as keyof AcademicYear,
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { 
      header: "End Date", 
      accessor: "endDate" as keyof AcademicYear,
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    { header: "Term", accessor: "term" as keyof AcademicYear },
    {
      header: "Status",
      accessor: "isActive" as keyof AcademicYear,
      render: (value: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "id" as keyof AcademicYear,
      render: (value: any, row: AcademicYear) => (
        !row.isActive && (
          <Button
            onClick={() => handleSetActive(value)}
            variant="secondary"
            size="sm"
          >
            Set Active
          </Button>
        )
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
        title="Academic Years"
        description="Manage academic years and terms for your school"
        action={
          <Button onClick={() => setShowModal(true)}>
            + Add Academic Year
          </Button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        <DataTable data={academicYears} columns={columns} />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Academic Year"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Academic Year Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., 2024/2025"
            required
          />
          
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="setAsActive"
              checked={formData.setAsActive}
              onChange={(e) => setFormData({ ...formData, setAsActive: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="setAsActive" className="ml-2 block text-sm text-gray-900">
              Set as active academic year
            </label>
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
