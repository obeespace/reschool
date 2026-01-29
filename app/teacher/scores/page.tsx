"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Modal, Input, Select, LoadingSpinner } from "@/app/components/UIComponents";

export default function TeacherScores() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    studentId: "",
    classId: "",
    subjectId: "",
    term: "1",
    classwork: "",
    homework: "",
    extracurricular: "",
    test: "",
    exam: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch subjects
      const subjectsRes = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }

      // Fetch classes
      const classesRes = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    if (!classId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/by-class?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleClassChange = (classId: string) => {
    setFormData({ ...formData, classId, studentId: "" });
    fetchStudents(classId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/scores/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: formData.studentId,
          classId: formData.classId,
          subjectId: formData.subjectId,
          term: parseInt(formData.term),
          classwork: parseFloat(formData.classwork) || 0,
          homework: parseFloat(formData.homework) || 0,
          extracurricular: parseFloat(formData.extracurricular) || 0,
          test: parseFloat(formData.test) || 0,
          exam: parseFloat(formData.exam) || 0,
        }),
      });

      if (response.ok) {
        toast.success("Score uploaded successfully!");
        setShowModal(false);
        setFormData({
          studentId: "",
          classId: "",
          subjectId: "",
          term: "1",
          classwork: "",
          homework: "",
          extracurricular: "",
          test: "",
          exam: "",
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to upload score");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="TEACHER">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="Upload Scores"
        description="Enter student scores for your assigned subjects"
        action={
          <Button onClick={() => setShowModal(true)}>+ Upload Score</Button>
        }
      />

      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Score Breakdown (Nigerian System)</h2>
          <div className="grid md:grid-cols-5 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">10</div>
              <div className="text-sm text-gray-600">Classwork</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">10</div>
              <div className="text-sm text-gray-600">Homework</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">10</div>
              <div className="text-sm text-gray-600">Extracurricular</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">30</div>
              <div className="text-sm text-gray-600">Test</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">60</div>
              <div className="text-sm text-gray-600">Exam</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold text-indigo-600">100</div>
            <div className="text-gray-600">Total Marks</div>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important</h3>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• You can only upload scores for subjects and classes assigned to you</li>
            <li>• Scores are automatically calculated (max 100 marks)</li>
            <li>• Uploading scores for an existing record will update it</li>
          </ul>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Student Score">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Class"
            value={formData.classId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={classes.map((c) => ({
              value: c._id,
              label: `${c.level} ${c.arm}`,
            }))}
            required
          />

          <Select
            label="Student"
            value={formData.studentId}
            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            options={students.map((s) => ({
              value: s._id,
              label: s.fullName,
            }))}
            required
          />

          <Select
            label="Subject"
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
            options={subjects.map((s) => ({
              value: s._id,
              label: s.name,
            }))}
            required
          />

          <Select
            label="Term"
            value={formData.term}
            onChange={(e) => setFormData({ ...formData, term: e.target.value })}
            options={[
              { value: "1", label: "First Term" },
              { value: "2", label: "Second Term" },
              { value: "3", label: "Third Term" },
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Classwork (0-10)"
              type="number"
              value={formData.classwork}
              onChange={(e) => setFormData({ ...formData, classwork: e.target.value })}
              placeholder="0"
            />

            <Input
              label="Homework (0-10)"
              type="number"
              value={formData.homework}
              onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
              placeholder="0"
            />

            <Input
              label="Extracurricular (0-10)"
              type="number"
              value={formData.extracurricular}
              onChange={(e) => setFormData({ ...formData, extracurricular: e.target.value })}
              placeholder="0"
            />

            <Input
              label="Test (0-30)"
              type="number"
              value={formData.test}
              onChange={(e) => setFormData({ ...formData, test: e.target.value })}
              placeholder="0"
            />

            <Input
              label="Exam (0-60)"
              type="number"
              value={formData.exam}
              onChange={(e) => setFormData({ ...formData, exam: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" fullWidth>
              Upload Score
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
