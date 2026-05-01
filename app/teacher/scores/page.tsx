"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Select, LoadingSpinner } from "@/app/components/UIComponents";

type ArchiveYear = { id: string; name: string; isActive: boolean };
type ArchiveTerm = {
  id: string;
  termNumber: number;
  academicYearId: string;
  academicYearName: string;
  isActive: boolean;
};

const TERM_NAMES = ["", "First", "Second", "Third"];

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
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isAcademicSheetLoading, setIsAcademicSheetLoading] = useState(false);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Archive selectors
  const [archiveYears, setArchiveYears] = useState<ArchiveYear[]>([]);
  const [archiveTerms, setArchiveTerms] = useState<ArchiveTerm[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [activeTermId, setActiveTermId] = useState("");

  const isArchiveMode = !!activeTermId && !!selectedTermId && selectedTermId !== activeTermId;

  const filteredTerms = useMemo(
    () => archiveTerms.filter((t) => !selectedSessionId || t.academicYearId === selectedSessionId),
    [archiveTerms, selectedSessionId]
  );

  const selectedTermLabel = useMemo(() => {
    const t = archiveTerms.find((t) => t.id === selectedTermId);
    if (!t) return "";
    return `${TERM_NAMES[t.termNumber] || "Term " + t.termNumber} Term — ${t.academicYearName}`;
  }, [archiveTerms, selectedTermId]);

  const [bulkForm, setBulkForm] = useState({
    classId: "",
    subjectId: "",
    type: "CLASSWORK",
    maxScore: "10",
  });

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [academicForm, setAcademicForm] = useState({
    classId: "",
    subjectId: "",
  });
  const [academicRows, setAcademicRows] = useState<BulkRow[]>([]);

  const fetchDailyMarks = useCallback(async (termId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/scores/daily-marks/list?termId=${termId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyMarks(data.dailyMarks || []);
      }
    } catch (error) {
      console.error("Error fetching daily marks:", error);
    }
  }, []);

  const fetchAcademicScores = useCallback(async (termId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`/api/scores/view?termId=${termId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAcademicScores(data.scores || []);
      }
    } catch (error) {
      console.error("Error fetching academic scores:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }

      const [archiveRes, classesRes, profileRes] = await Promise.all([
        fetch("/api/records/archive-options", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/classes/list", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/teachers/create", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (archiveRes.ok) {
        const data = await archiveRes.json();
        setArchiveYears(data.academicYears || []);
        setArchiveTerms(data.terms || []);
        if (data.activeAcademicYearId) setSelectedSessionId(data.activeAcademicYearId);
        if (data.activeTermId) {
          setActiveTermId(data.activeTermId);
          setSelectedTermId(data.activeTermId);
          fetchDailyMarks(data.activeTermId);
          fetchAcademicScores(data.activeTermId);
        }
      }

      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }

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
  }, [router, fetchDailyMarks, fetchAcademicScores]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when selected term changes after initial load
  useEffect(() => {
    if (!selectedTermId) return;
    if (!initialized) { setInitialized(true); return; }
    fetchDailyMarks(selectedTermId);
    fetchAcademicScores(selectedTermId);
    setBulkRows([]);
    setAcademicRows([]);
  }, [selectedTermId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isArchiveMode) return;
    if (!bulkForm.classId || !bulkForm.subjectId) {
      toast.error("Please select class and subject first");
      return;
    }

    if (!selectedTermId) {
      toast.error("No active term found");
      return;
    }

    setIsSheetLoading(true);
    try {
      const token = localStorage.getItem("token");
      const students = await fetchStudentsByClass(bulkForm.classId);

      const marksRes = await fetch(
        `/api/scores/daily-marks/list?termId=${selectedTermId}&classId=${bulkForm.classId}&subjectId=${bulkForm.subjectId}&assessmentType=${bulkForm.type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let existingMarks: any[] = [];
      if (marksRes.ok) {
        const marksData = await marksRes.json();
        existingMarks = marksData.dailyMarks || [];
      }

      const marksByStudent = new Map<string, any>();
      existingMarks.forEach((mark: any) => {
        // list API returns studentId as string (populated or raw)
        const sid = mark.studentId?.toString?.() || (typeof mark.studentId === "string" ? mark.studentId : null);
        if (sid) marksByStudent.set(sid, mark);
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
    if (isArchiveMode) return;
    if (!academicForm.classId || !academicForm.subjectId) {
      toast.error("Please select class and subject first");
      return;
    }
    if (!selectedTermId) {
      toast.error("No active term found");
      return;
    }

    setIsAcademicSheetLoading(true);
    try {
      const token = localStorage.getItem("token");
      const students = await fetchStudentsByClass(academicForm.classId);

      const scoresRes = await fetch(
        `/api/scores/view?termId=${selectedTermId}&classId=${academicForm.classId}&subjectId=${academicForm.subjectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let existingScores: any[] = [];
      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        existingScores = scoresData.scores || [];
      }

      const scoreByStudent = new Map<string, any>();
      existingScores.forEach((row: any) => {
        const sid = String(row.studentId || "");
        if (sid) scoreByStudent.set(sid, row);
      });

      setAcademicRows(
        students.map((student: any) => {
          const existing = scoreByStudent.get(String(student._id));
          return {
            studentId: String(student._id),
            studentName: student.fullName,
            score: existing?.total != null ? String(existing.total) : "",
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
    if (isArchiveMode) return;
    if (!selectedTermId) {
      toast.error("No active term found");
      return;
    }

    const validRows = bulkRows.filter((row) => row.score !== "");
    if (validRows.length === 0) {
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
          entries: validRows.map((row) => ({
            studentId: row.studentId,
            classId: bulkForm.classId,
            subjectId: bulkForm.subjectId,
            score: Number(row.score),
            assessmentType: bulkForm.type,
            notes: row.notes,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to save marks");
        return;
      }

      toast.success(`Saved ${(data.upserted ?? 0) + (data.modified ?? 0) || validRows.length} marks`);
      fetchDailyMarks(selectedTermId);
      loadBulkSheet();
    } catch (error) {
      console.error("Error saving bulk marks:", error);
      toast.error("Failed to save marks");
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleSaveAcademicScores = async () => {
    if (isArchiveMode) return;
    if (!academicForm.classId || !academicForm.subjectId) {
      toast.error("Class and subject are required");
      return;
    }

    const validRows = academicRows.filter((row) => row.score !== "");

    if (validRows.length === 0) {
      toast.error("Enter at least one score to save");
      return;
    }

    setIsSavingAcademic(true);
    let saved = 0;
    try {
      const token = localStorage.getItem("token");
      for (const row of validRows) {
        const res = await fetch("/api/scores/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            studentId: row.studentId,
            subjectId: academicForm.subjectId,
            classId: academicForm.classId,
            score: Number(row.score),
          }),
        });
        if (res.ok) saved++;
      }

      toast.success(`Saved ${saved} academic scores`);
      await fetchAcademicScores(selectedTermId);
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

      {/* Archive selectors */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Academic Session"
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              const firstTerm = archiveTerms.find((t) => t.academicYearId === e.target.value);
              if (firstTerm) setSelectedTermId(firstTerm.id);
            }}
            options={archiveYears.map((y) => ({
              value: y.id,
              label: y.name + (y.isActive ? " (Current)" : ""),
            }))}
          />
          <Select
            label="Term"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            options={filteredTerms.map((t) => ({
              value: t.id,
              label: `${TERM_NAMES[t.termNumber] || "Term " + t.termNumber} Term${t.isActive ? " (Active)" : ""}`,
            }))}
          />
        </div>
      </div>

      {/* Archive mode banner */}
      {isArchiveMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-amber-600 font-semibold text-sm">📁 Viewing archived records</span>
          <span className="text-amber-700 text-sm">— {selectedTermLabel}. Editing is disabled for past terms.</span>
        </div>
      )}

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
          {!isArchiveMode && (
            <>
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
                  { value: "HOMEWORK", label: "Homework" },
                  { value: "EVALUATION", label: "Test / Evaluation" },
                  { value: "EXAM", label: "Exam" },
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
            </>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {isArchiveMode ? `Daily Marks — ${selectedTermLabel}` : "Recent Daily Marks"}
              </h3>
              {isArchiveMode && (
                <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">Read-only</span>
              )}
            </div>
            {dailyMarks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No daily marks recorded for this term</div>
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
                      <tr key={mark._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm">{mark.studentName || mark.studentId?.fullName}</td>
                        <td className="px-6 py-3 text-sm">{mark.subjectName || mark.subjectId?.name}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium capitalize">
                            {(mark.assessmentType || mark.type || "").toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold">{mark.score}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {(mark.assessmentDate || mark.recordedDate)
                            ? new Date(mark.assessmentDate || mark.recordedDate).toLocaleDateString()
                            : "N/A"}
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
          {!isArchiveMode && (
            <>
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
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Total Score</th>
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
            </>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {isArchiveMode ? `Academic Records — ${selectedTermLabel}` : "Recent Academic Records"}
              </h3>
              {isArchiveMode && (
                <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">Read-only</span>
              )}
            </div>
            {academicScores.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No academic records for this term</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Subject</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Classwork</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Homework</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Test</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Exam</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {academicScores.map((score: any, index: number) => (
                      <tr key={score._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm">{score.studentName || "N/A"}</td>
                        <td className="px-6 py-3 text-sm">{score.subjectName || score.subjectId?.name || "N/A"}</td>
                        <td className="px-6 py-3 text-center text-sm">{score.classwork ?? "-"}</td>
                        <td className="px-6 py-3 text-center text-sm">{score.homework ?? "-"}</td>
                        <td className="px-6 py-3 text-center text-sm">{score.test ?? "-"}</td>
                        <td className="px-6 py-3 text-center text-sm">{score.exam ?? "-"}</td>
                        <td className="px-6 py-3 text-center text-sm font-bold">{score.total ?? "-"}</td>
                        <td className="px-6 py-3 text-center text-sm font-semibold text-indigo-600">{score.grade ?? "-"}</td>
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
