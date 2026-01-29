"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Modal, Input, LoadingSpinner } from "@/app/components/UIComponents";

export default function AdminSubjects() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchSubjects();
  }, [router]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Subject created successfully!");
        setShowModal(false);
        setFormData({ name: "", code: "" });
        fetchSubjects();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create subject");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="ADMIN">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Subjects"
        description="Manage subjects taught in your school"
        action={
          <Button onClick={() => setShowModal(true)}>+ Add Subject</Button>
        }
      />

      <div className="p-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subject Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Code
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subjects.map((subject) => (
                <tr key={subject._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{subject.name}</td>
                  <td className="px-6 py-4 text-gray-600">{subject.code || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {subjects.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No subjects yet. Click "+ Add Subject" to create one.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Subject">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Mathematics"
            required
          />

          <Input
            label="Subject Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g., MATH"
          />

          <div className="flex gap-3">
            <Button type="submit" fullWidth>
              Create Subject
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} fullWidth>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
