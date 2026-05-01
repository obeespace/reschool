"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Select, LoadingSpinner } from "@/app/components/UIComponents";

interface BulkRow {
  studentId: string;
  studentName: string;
  score: string;
  notes: string;
}

export default function TeacherScores() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "academic">("daily");
  const [classes, setClasses] = useState<any[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [dailyMarks, setDailyMarks] = useState<any[]>([]);
  const [academicScores, setAcademicScores] = useState<any[]>([]);
  const [academicYear, setAcademicYear] = useState<any>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isAcademicSheetLoading, setIsAcademicSheetLoading] = useState(false);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    classId: "",
    subjectId: "",
    type: "classwork",
    maxScore: "10",
  });

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [academicForm, setAcademicForm] = useState({
    classId: "",
    subjectId: "",
  });
  const [academicRows, setAcademicRows] = useState<BulkRow[]>([]);

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

      const yearRes = await fetch("/api/academic-years/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (yearRes.ok) {
        const data = await yearRes.json();
        setAcademicYear(data.academicYear);
        if (data.academicYear) {
          fetchDailyMarks(data.academicYear._id);
          fetchAcademicScores();
        }
      }

      const classesRes = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }

      const profileRes = await fetch("/api/teachers/create", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setTeacherAssignments(data.profile?.subjectsAndClasses || []);
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

  const fetchAcademicScores = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/scores/view", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAcademicScores(data.scores || []);
      }
    } catch (error) {
      console.error("Error fetching academic scores:", error);
    }
  };

  const allowedClassIds = useMemo(() => {
    const ids = new Set<string>();
    teacherAssignments.forEach((assignment: any) => {
      (assignment.classIds || []).forEach((classItem: any) => {
        if (classItem?._id) ids.add(classItem._id.toString());
      });
    });
    return ids;
  }, [teacherAssignments]);

  const availableClasses = useMemo(
    () => classes.filter((classItem: any) => allowedClassIds.has(classItem._id?.toString())),
    [classes, allowedClassIds]
  );

  const availableSubjects = useMemo(() => {
    if (!bulkForm.classId) return [];
    const uniqueSubjects = new Map<string, any>();

    teacherAssignments.forEach((assignment: any) => {
      const teachesSelectedClass = (assignment.classIds || []).some(
        (classItem: any) => classItem?._id?.toString() === bulkForm.classId
      );

      if (teachesSelectedClass && assignment.subjectId?._id) {
        uniqueSubjects.set(assignment.subjectId._id.toString(), assignment.subjectId);
      }
    });

    return Array.from(uniqueSubjects.values());
  }, [bulkForm.classId, teacherAssignments]);

  const availableAcademicSubjects = useMemo(() => {
    if (!academicForm.classId) return [];
    const uniqueSubjects = new Map<string, any>();

    teacherAssignments.forEach((assignment: any) => {
      const teachesSelectedClass = (assignment.classIds || []).some(
        (classItem: any) => classItem?._id?.toString() === academicForm.classId
      );

      if (teachesSelectedClass && assignment.subjectId?._id) {
        uniqueSubjects.set(assignment.subjectId._id.toString(), assignment.subjectId);
      }
    });

    return Array.from(uniqueSubjects.values());
  }, [academicForm.classId, teacherAssignments]);

  const fetchStudentsByClass = async (classId: string) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/students/by-class?classId=${classId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to load students");
    }

    const data = await response.json();
    return data.students || [];
  };

  const loadBulkSheet = async () => {
    if (!bulkForm.classId || !bulkForm.subjectId) {
      toast.error("Please select class and subject first");
      return;
    }

    if (!academicYear?._id) {
      toast.error("No active academic year found");
      return;
    }

    setIsSheetLoading(true);
    try {
      const token = localStorage.getItem("token");
      const students = await fetchStudentsByClass(bulkForm.classId);

      const marksRes = await fetch(
        `/api/scores/daily-marks/list?academicYearId=${academicYear._id}&classId=${bulkForm.classId}&subjectId=${bulkForm.subjectId}&type=${bulkForm.type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let existingMarks: any[] = [];
      if (marksRes.ok) {
        const marksData = await marksRes.json();
        existingMarks = marksData.dailyMarks || [];
      }

      const marksByStudent = new Map<string, any>();
      existingMarks.forEach((mark: any) => {
        if (mark.studentId?._id) {
          marksByStudent.set(mark.studentId._id.toString(), mark);
        }
      });

      const rows: BulkRow[] = students.map((student: any) => {
        const existing = marksByStudent.get(student._id.toString());
        return {
          studentId: student._id.toString(),
          studentName: student.fullName,
          score: existing?.score !== undefined ? String(existing.score) : "",
          notes: existing?.feedbackNotes || "",
        };
      });

      setBulkRows(rows);
      toast.success("Class sheet loaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to load class sheet");
    } finally {
      setIsSheetLoading(false);
    }
  };

  const loadAcademicSheet = async () => {
    if (!academicForm.classId || !academicForm.subjectId) {
      toast.error("Please select class and subject first");
      return;
    }

    setIsAcademicSheetLoading(true);
    try {
      const token = localStorage.getItem("token");
      const students = await fetchStudentsByClass(academicForm.classId);

      const scoresRes = await fetch(
        `/api/scores/view?classId=${academicForm.classId}&subjectId=${academicForm.subjectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let existingScores: any[] = [];
      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        existingScores = scoresData.scores || [];
      }

      const scoreByStudent = new Map<string, any>();
      existingScores.forEach((row: any) => {
        const sid = row?.studentId?._id;
        if (sid) scoreByStudent.set(String(sid), row);
      });

      setAcademicRows(
        students.map((student: any) => {
          const existing = scoreByStudent.get(String(student._id));
          return {
            studentId: String(student._id),
            studentName: student.fullName,
            score: existing?.score != null ? String(existing.score) : "",
            notes: "",
          };
        })
      );

      toast.success("Academic sheet loaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to load academic sheet");
    } finally {
      setIsAcademicSheetLoading(false);
    }
  };

  const updateBulkRow = (index: number, field: "score" | "notes", value: string) => {
    setBulkRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row
      )
    );
  };

  const updateAcademicRow = (index: number, field: "score" | "notes", value: string) => {
    setAcademicRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row
      )
    );
  };

  const handleSaveBulkMarks = async () => {
    if (!academicYear?._id) {
      toast.error("No active academic year found");
      return;
    }

    const entries = bulkRows
      .filter((row) => row.score !== "")
      .map((row) => ({
        studentId: row.studentId,
        score: Number(row.score),
        notes: row.notes,
      }));

    if (entries.length === 0) {
      toast.error("Enter at least one score to save");
      return;
    }

    setIsSavingBulk(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/scores/daily-marks/bulk-upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: bulkForm.classId,
          subjectId: bulkForm.subjectId,
          type: bulkForm.type,
          maxScore: Number(bulkForm.maxScore) || 10,
          academicYearId: academicYear._id,
          entries,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to save marks");
        return;
      }

      toast.success(`Saved ${data.summary?.totalProcessed || entries.length} marks`);
      fetchDailyMarks(academicYear._id);
      loadBulkSheet();
    } catch (error) {
      console.error("Error saving bulk marks:", error);
      toast.error("Failed to save marks");
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleSaveAcademicScores = async () => {
    if (!academicForm.classId || !academicForm.subjectId) {
      toast.error("Class and subject are required");
      return;
    }

    const entries = academicRows
      .filter((row) => row.score !== "")
      .map((row) => ({
        studentId: row.studentId,
        score: Number(row.score),
      }));

    if (entries.length === 0) {
      toast.error("Enter at least one score to save");
      return;
    }

    setIsSavingAcademic(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/scores/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: academicForm.classId,
          subjectId: academicForm.subjectId,
          entries,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to upload academic scores");
        return;
      }

      toast.success(`Saved ${data.summary?.totalProcessed || entries.length} academic scores`);
      await fetchAcademicScores();
      await loadAcademicSheet();
    } catch (error) {
      console.error("Error uploading academic scores:", error);
      toast.error("Failed to upload academic scores");
    } finally {
      setIsSavingAcademic(false);
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
        description="Enter and edit class scores in bulk"
      />

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

      {activeTab === "daily" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Bulk Entry:</strong> Select a class and subject, load the class sheet, fill scores/notes for all students, and save once. Existing records are prefilled for editing.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Class"
                value={bulkForm.classId}
                onChange={(e) => {
                  setBulkForm((prev) => ({ ...prev, classId: e.target.value, subjectId: "" }));
                  setBulkRows([]);
                }}
                options={[
                  { value: "", label: "Select Class" },
                  ...availableClasses.map((classItem: any) => ({
                    value: classItem._id,
                    label: `${classItem.level} ${classItem.arm}`,
                  })),
                ]}
                required
              />

              <Select
                label="Subject"
                value={bulkForm.subjectId}
                onChange={(e) => {
                  setBulkForm((prev) => ({ ...prev, subjectId: e.target.value }));
                  setBulkRows([]);
                }}
                options={[
                  { value: "", label: "Select Subject" },
                  ...availableSubjects.map((subject: any) => ({
                    value: subject._id,
                    label: subject.name,
                  })),
                ]}
                required
              />

              <Select
                label="Mark Type"
                value={bulkForm.type}
                onChange={(e) => {
                  setBulkForm((prev) => ({ ...prev, type: e.target.value }));
                  setBulkRows([]);
                }}
                options={[
                  { value: "classwork", label: "Classwork" },
                  { value: "homework", label: "Homework" },
                  { value: "test", label: "Test" },
                  { value: "exam", label: "Exam" },
                  { value: "extracurricular", label: "Extracurricular" },
                ]}
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Max Score</label>
                <input
                  type="number"
                  min="1"
                  value={bulkForm.maxScore}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, maxScore: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={loadBulkSheet} disabled={isSheetLoading}>
                {isSheetLoading ? "Loading Sheet..." : "Load Class Sheet"}
              </Button>
              <Button variant="secondary" onClick={() => setBulkRows([])}>
                Clear Sheet
              </Button>
            </div>
          </div>

          {bulkRows.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Student Score Sheet</h3>
                <Button onClick={handleSaveBulkMarks} disabled={isSavingBulk}>
                  {isSavingBulk ? "Saving..." : "Save All Marks"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-180">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bulkRows.map((row, index) => (
                      <tr key={row.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.studentName}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.score}
                            onChange={(e) => updateBulkRow(index, "score", e.target.value)}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => updateBulkRow(index, "notes", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Optional comment"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Recent Daily Marks</h3>
            </div>
            {dailyMarks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No daily marks recorded yet</div>
            ) : (
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
                        <td className="px-6 py-3 text-sm">{mark.subjectId?.name || mark.subjectName || mark.subjectId}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium capitalize">
                            {mark.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold">{mark.score}/{mark.maxScore}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {mark.recordedDate ? new Date(mark.recordedDate).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "academic" && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Academic Records:</strong> These are permanent records of tests and exams.
              Used for official transcripts and academic history.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Class"
                value={academicForm.classId}
                onChange={(e) => {
                  setAcademicForm((prev) => ({ ...prev, classId: e.target.value, subjectId: "" }));
                  setAcademicRows([]);
                }}
                options={[
                  { value: "", label: "Select Class" },
                  ...availableClasses.map((classItem: any) => ({
                    value: classItem._id,
                    label: `${classItem.level} ${classItem.arm}`,
                  })),
                ]}
                required
              />

              <Select
                label="Subject"
                value={academicForm.subjectId}
                onChange={(e) => {
                  setAcademicForm((prev) => ({ ...prev, subjectId: e.target.value }));
                  setAcademicRows([]);
                }}
                options={[
                  { value: "", label: "Select Subject" },
                  ...availableAcademicSubjects.map((subject: any) => ({
                    value: subject._id,
                    label: subject.name,
                  })),
                ]}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={loadAcademicSheet} disabled={isAcademicSheetLoading}>
                {isAcademicSheetLoading ? "Loading Sheet..." : "Load Academic Sheet"}
              </Button>
              <Button variant="secondary" onClick={() => setAcademicRows([])}>
                Clear Sheet
              </Button>
            </div>
          </div>

          {academicRows.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Academic Score Sheet</h3>
                <Button onClick={handleSaveAcademicScores} disabled={isSavingAcademic}>
                  {isSavingAcademic ? "Saving..." : "Save Academic Scores"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-160">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {academicRows.map((row, index) => (
                      <tr key={row.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.studentName}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.score}
                            onChange={(e) => updateAcademicRow(index, "score", e.target.value)}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Recent Academic Records</h3>
            </div>
            {academicScores.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No academic records uploaded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {academicScores.map((score: any, index: number) => (
                      <tr key={score.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm">{score.studentId?.fullName || "N/A"}</td>
                        <td className="px-6 py-3 text-sm">{score.subjectId?.name || "N/A"}</td>
                        <td className="px-6 py-3 text-sm font-semibold">{score.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
