"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Modal, Input, Select, LoadingSpinner, DataTable } from "@/app/components/UIComponents";
import { Plus, Trash2 } from "lucide-react";

export default function TeacherScores() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "academic">("daily");
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dailyMarks, setDailyMarks] = useState<any[]>([]);
  const [academicYear, setAcademicYear] = useState<any>(null);
  const [dailyFormData, setDailyFormData] = useState({
    studentId: "",
    classId: "",
    subjectId: "",
    type: "classwork",
    score: "",
    maxScore: "10",
    notes: "",
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
      
      // Fetch current academic year
      const yearRes = await fetch("/api/academic-years/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (yearRes.ok) {
        const data = await yearRes.json();
        setAcademicYear(data.academicYear);
        
        // Fetch daily marks
        if (data.academicYear) {
          fetchDailyMarks(data.academicYear._id);
        }
      }
      
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
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailyMarks = async (academicYearId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/scores/daily-marks/list?academicYearId=${academicYearId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyMarks(data.dailyMarks || []);
      }
    } catch (error) {
      console.error("Error fetching daily marks:", error);
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
    setDailyFormData({ ...dailyFormData, classId, studentId: "" });
    fetchStudents(classId);
  };

  const handleDailyMarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dailyFormData.studentId || !dailyFormData.subjectId || !dailyFormData.score) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!academicYear) {
      toast.error("No active academic year found");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/scores/daily-marks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: dailyFormData.studentId,
          subjectId: dailyFormData.subjectId,
          classId: dailyFormData.classId,
          type: dailyFormData.type,
          score: parseFloat(dailyFormData.score),
          maxScore: parseFloat(dailyFormData.maxScore) || 10,
          notes: dailyFormData.notes,
          academicYearId: academicYear._id,
        }),
      });

      if (response.ok) {
        toast.success("Daily mark recorded successfully!");
        setShowDailyModal(false);
        setDailyFormData({
          studentId: "",
          classId: "",
          subjectId: "",
          type: "classwork",
          score: "",
          maxScore: "10",
          notes: "",
        });
        fetchDailyMarks(academicYear._id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to record daily mark");
      }
    } catch (error) {
      console.error("Error:", error);
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
        description="Manage daily marks and academic records"
        action={
          activeTab === "daily" ? (
            <Button onClick={() => setShowDailyModal(true)} className="flex items-center gap-2">
              <Plus size={18} /> Record Daily Mark
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("daily")}
            className={`py-3 px-4 font-medium transition-colors ${
              activeTab === "daily"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Daily Marks
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={`py-3 px-4 font-medium transition-colors ${
              activeTab === "academic"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Academic Records
          </button>
        </div>
      </div>

      {/* Daily Marks Tab */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Daily Marks Info:</strong> These marks track daily performance (classwork, homework, tests, extracurricular). 
              Parents can view real-time updates. These will be cleared at the end of the academic year.
            </p>
          </div>

          {dailyMarks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No daily marks recorded yet</p>
              <Button onClick={() => setShowDailyModal(true)}>Record Your First Daily Mark</Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dailyMarks.map((mark: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm">{mark.studentId?.fullName}</td>
                        <td className="px-6 py-3 text-sm">{mark.subjectId?.name}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium capitalize">
                            {mark.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold">{mark.score}/{mark.maxScore}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {new Date(mark.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Academic Records Tab */}
      {activeTab === "academic" && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Academic Records:</strong> These are permanent records of tests and exams. 
              Used for official transcripts and academic history.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Academic records upload feature coming soon</p>
          </div>
        </div>
      )}

      {/* Daily Mark Modal */}
      <Modal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        title="Record Daily Mark"
      >
        <form onSubmit={handleDailyMarkSubmit} className="space-y-4">
          <Select
            label="Class"
            value={dailyFormData.classId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={[
              { value: "", label: "Select Class" },
              ...classes.map(c => ({ value: c._id, label: `${c.level} ${c.arm}` }))
            ]}
            required
          />

          <Select
            label="Student"
            value={dailyFormData.studentId}
            onChange={(e) => setDailyFormData({ ...dailyFormData, studentId: e.target.value })}
            options={[
              { value: "", label: "Select Student" },
              ...students.map(s => ({ value: s._id, label: s.fullName }))
            ]}
            required
          />

          <Select
            label="Subject"
            value={dailyFormData.subjectId}
            onChange={(e) => setDailyFormData({ ...dailyFormData, subjectId: e.target.value })}
            options={[
              { value: "", label: "Select Subject" },
              ...subjects.map(s => ({ value: s._id, label: s.name }))
            ]}
            required
          />

          <Select
            label="Mark Type"
            value={dailyFormData.type}
            onChange={(e) => setDailyFormData({ ...dailyFormData, type: e.target.value })}
            options={[
              { value: "classwork", label: "Classwork" },
              { value: "homework", label: "Homework" },
              { value: "test", label: "Test" },
              { value: "extracurricular", label: "Extracurricular" },
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Score (0-100)"
              type="number"
              value={dailyFormData.score}
              onChange={(e) => setDailyFormData({ ...dailyFormData, score: e.target.value })}
              placeholder="e.g., 85"
              required
            />
            <Input
              label="Max Score"
              type="number"
              value={dailyFormData.maxScore}
              onChange={(e) => setDailyFormData({ ...dailyFormData, maxScore: e.target.value })}
              placeholder="e.g., 10"
            />
          </div>

          <Input
            label="Notes (Optional)"
            type="text"
            value={dailyFormData.notes}
            onChange={(e) => setDailyFormData({ ...dailyFormData, notes: e.target.value })}
            placeholder="Add any comments..."
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Record Mark</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDailyModal(false)}
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
