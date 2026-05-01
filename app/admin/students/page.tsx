"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import {
  PageHeader,
  DataTable,
  Modal,
  Button,
  Input,
  Select,
} from "@/app/components/UIComponents";

interface Student {
  id: string;
  fullName: string;
  admissionNumber: string;
  currentClass: string | null;
  currentClassId: string | null;
  dateOfBirth: string;
  gender: string;
}

type ClassOption = {
  _id: string;
  level: string;
  arm: string;
};

interface ParentCredentials {
  email: string;
  password: string;
  studentName: string;
  admissionNumber: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentCredentials, setParentCredentials] =
    useState<ParentCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
  }, [router]);

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

    if (!formData.fullName || !formData.classId) {
      toast.error("Please fill student name and class");
      return;
    }

    if (!formData.parentEmail && !formData.parentPhone) {
      toast.error("Please provide the guardian's email address or phone number");
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
          admissionNumber: formData.admissionNumber || undefined,
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
        toast.error(data.error || "Failed to enrol student");
        return;
      }

      setShowModal(false);
      fetchStudents();

      if (data.parentCredentials) {
        // A new parent account was created — show credentials to admin
        setParentCredentials({
          email: data.parentCredentials.email,
          password: data.parentCredentials.password,
          studentName: formData.fullName,
          admissionNumber:
            data.student?.admissionNumber || formData.admissionNumber || "",
        });
      } else {
        toast.success("Student enrolled successfully");
      }

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
    } catch (error) {
      console.error("Create student error:", error);
      toast.error("Failed to enrol student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Copy failed — please copy manually");
    }
  };

  const columns = [
    {
      header: "Admission No.",
      accessor: "admissionNumber" as keyof Student,
    },
    { header: "Full Name", accessor: "fullName" as keyof Student },
    {
      header: "Current Class",
      accessor: "currentClass" as keyof Student,
      render: (value: string | null) => value || "Not assigned",
    },
    {
      header: "Gender",
      accessor: "gender" as keyof Student,
      render: (value: string) => value || "N/A",
    },
    {
      header: "Date of Birth",
      accessor: "dateOfBirth" as keyof Student,
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "N/A",
    },
    {
      header: "Actions",
      accessor: "id" as keyof Student,
      render: (_: string, row: Student) => (
        <Button
          size="sm"
          onClick={() => router.push(`/admin/students/${row.id}`)}
        >
          Academic Record
        </Button>
      ),
    },
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
        description="Manage student enrolment and guardian accounts"
        action={<Button onClick={() => setShowModal(true)}>+ Add Student</Button>}
      />

      <div className="bg-white rounded-lg shadow">
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No students enrolled yet</p>
            <p className="text-sm">
              Use the Add Student button to enrol the first student
            </p>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length}
              </p>
            </div>
            <DataTable data={students} columns={columns} />
          </div>
        )}
      </div>

      {/* ─── Enrol Student Modal ─── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Enrol New Student"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {/* Student details */}
          <Input
            label="Student Full Name *"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            required
          />

          <Input
            label="Admission Number"
            value={formData.admissionNumber}
            onChange={(e) =>
              setFormData({ ...formData, admissionNumber: e.target.value })
            }
            placeholder="Leave blank to auto-generate"
          />

          <Select
            label="Class *"
            value={formData.classId}
            onChange={(e) =>
              setFormData({ ...formData, classId: e.target.value })
            }
            options={[
              { value: "", label: "Select Class" },
              ...classes.map((c) => ({
                value: c._id,
                label: `${c.level} ${c.arm}`,
              })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              options={[
                { value: "", label: "Select" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
              ]}
            />
          </div>

          {/* Parent / Guardian account */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
            <div>
              <h3 className="font-semibold text-blue-900">
                Parent / Guardian Account
              </h3>
              <p className="text-xs text-blue-700 mt-1">
                A parent login account is created when you provide an email. If
                the email already belongs to a guardian in this school, the
                student is linked to that existing account instead. Give the
                login details to the parent — they can change their password
                later from their Profile page.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Parent Login Email"
                type="email"
                value={formData.parentEmail}
                onChange={(e) =>
                  setFormData({ ...formData, parentEmail: e.target.value })
                }
                placeholder="parent@example.com"
              />
              <Input
                label="Phone Number"
                value={formData.parentPhone}
                onChange={(e) =>
                  setFormData({ ...formData, parentPhone: e.target.value })
                }
              />
            </div>

            <Input
              label="Parent Full Name"
              value={formData.parentFullName}
              onChange={(e) =>
                setFormData({ ...formData, parentFullName: e.target.value })
              }
              placeholder="Required when creating a new account"
            />

            <div>
              <Input
                label="Initial Password (for new account)"
                type="text"
                value={formData.parentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, parentPassword: e.target.value })
                }
                placeholder="Leave blank to auto-generate"
              />
              <p className="text-xs text-blue-600 mt-1">
                If left blank, a secure password is generated and shown to you
                after enrolment so you can hand it to the parent.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Enrolling..." : "Enrol Student"}
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

      {/* ─── Parent Credentials Modal ─── */}
      <Modal
        isOpen={!!parentCredentials}
        onClose={() => setParentCredentials(null)}
        title="Student Enrolled — Parent Account Created"
      >
        {parentCredentials && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <span className="text-green-600 text-xl mt-0.5">✓</span>
              <div>
                <p className="font-semibold text-green-800">
                  {parentCredentials.studentName} has been enrolled
                </p>
                {parentCredentials.admissionNumber && (
                  <p className="text-sm text-green-700">
                    Admission No: {parentCredentials.admissionNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-amber-900 text-sm">
                ⚠ Record these credentials — they are shown only once
              </p>
              <p className="text-xs text-amber-700">
                Hand the email and password below to the parent. They can log in
                at the school portal and change their password from the Profile
                section of their dashboard.
              </p>

              {/* Email */}
              <div className="bg-white rounded border p-3">
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  Parent Login Email
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900 break-all">
                    {parentCredentials.email}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(parentCredentials.email, "email")
                    }
                    className="shrink-0 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    {copiedField === "email" ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-white rounded border p-3">
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  Initial Password
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900 break-all">
                    {parentCredentials.password}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(parentCredentials.password, "password")
                    }
                    className="shrink-0 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    {copiedField === "password" ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setParentCredentials(null)}
            >
              I have recorded the credentials — Close
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
