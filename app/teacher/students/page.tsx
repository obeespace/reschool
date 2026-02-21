"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable, Modal, Button, Input, Select } from "@/app/components/UIComponents";
import { Trash2, Edit2, Eye } from "lucide-react";

interface Student {
  _id: string;
  id?: string;
  fullName: string;
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: string;
  parentId?: string;
}

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleDelete = async (studentId: string) => {
    setDeletingId(studentId);
    const toastId = toast.custom((t) => (
      <div className="bg-white rounded-lg p-4 shadow-lg border border-gray-200 space-y-3">
        <p className="font-medium text-gray-900">Delete this student?</p>
        <p className="text-sm text-gray-600">This action cannot be undone.</p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={async () => {
              toast.dismiss(toastId);
              try {
                const token = localStorage.getItem("token");
                const response = await fetch(`/api/students/delete/${studentId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                  toast.success("Student deleted successfully!");
                  loadTeacherStudents();
                } else {
                  const error = await response.json();
                  toast.error(error.error || "Failed to delete student");
                }
              } catch (error) {
                console.error("Delete error:", error);
                toast.error("Failed to delete student");
              } finally {
                setDeletingId(null);
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => {
              toast.dismiss(toastId);
              setDeletingId(null);
            }}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ));
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      fullName: student.fullName,
      admissionNumber: student.admissionNumber,
      dateOfBirth: student.dateOfBirth || "",
      gender: student.gender || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) return;
    if (!formData.fullName || !formData.admissionNumber) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/update/${selectedStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Student updated successfully!");
        setShowEditModal(false);
        setSelectedStudent(null);
        loadTeacherStudents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update student");
      }
    } catch (error) {
      toast.error("Failed to update student");
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
    { header: "Gender", accessor: "gender" as keyof Student },
    {
      header: "Actions",
      accessor: "_id" as keyof Student,
      render: (studentId: any, row: Student) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStudent(row);
              setShowDetailsModal(true);
            }}
            className="p-2 hover:bg-blue-100 rounded text-blue-600 transition-colors"
            title="View details"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
            className="p-2 hover:bg-green-100 rounded text-green-600 transition-colors"
            title="Edit student"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(studentId);
            }}
            disabled={deletingId === studentId}
            className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors disabled:opacity-50"
            title="Delete student"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    }
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
        description={`View students in ${classInfo?.level} ${classInfo?.arm}`}
      />

      <div className="mb-6 bg-linear-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
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
            <p className="text-sm">Contact your administrator to add students</p>
          </div>
        ) : (
          <DataTable data={students} columns={columns} />
        )}
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Student Details"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 font-medium">Full Name</label>
                <p className="text-lg font-semibold mt-1">{selectedStudent.fullName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">Admission Number</label>
                <p className="text-lg font-semibold mt-1">{selectedStudent.admissionNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">Gender</label>
                <p className="text-lg font-semibold mt-1">{selectedStudent.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">Date of Birth</label>
                <p className="text-lg font-semibold mt-1">
                  {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
              <p><strong>Class:</strong> {classInfo?.level} {classInfo?.arm}</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditClick(selectedStudent);
                }}
                className="flex-1"
              >
                Edit Student
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDetailsModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Student"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
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
            <p><strong>Note:</strong> Student in {classInfo?.level} {classInfo?.arm}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Save Changes</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
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
