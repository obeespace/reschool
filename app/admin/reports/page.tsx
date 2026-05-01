"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, PageHeader } from "@/app/components/UIComponents";

type ReportCard = {
  id: string;
  studentId: string;
  classId: string;
  className: string;
  termNumber: number;
  yearLabel: string;
  averageScore: number;
  classRanking: number | null;
  attendancePercentage: number | null;
  lowAttendanceAlert: boolean;
  isReleased: boolean;
};

type ClassSummary = {
  classId: string;
  className: string;
  total: number;
  released: number;
  lowAttendance: number;
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalClasses: 0,
    activeAcademicYear: null as { _id: string; name: string; isActive: boolean; term?: number; startDate?: string; endDate?: string } | null,
  });
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [termId, setTermId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [releasingClassId, setReleasingClassId] = useState<string | null>(null);
  const [releasingAll, setReleasingAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReportCards = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/reports/list?limit=500", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const cards: ReportCard[] = data.reports || [];
        setReportCards(cards);
        setTermId(data.termId || null);

        const byClass = new Map<string, ClassSummary>();
        cards.forEach((card) => {
          const entry = byClass.get(card.classId) || {
            classId: card.classId,
            className: card.className,
            total: 0,
            released: 0,
            lowAttendance: 0,
          };
          entry.total += 1;
          if (card.isReleased) entry.released += 1;
          if (card.lowAttendanceAlert) entry.lowAttendance += 1;
          byClass.set(card.classId, entry);
        });
        setClassSummaries(Array.from(byClass.values()));
      }
    } catch (err) {
      console.error("Load report cards error:", err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchStats();
    loadReportCards(token);
  }, [router, loadReportCards]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");

      const [studentsRes, teachersRes, parentsRes, classesRes, academicYearsRes] = await Promise.all([
        fetch("/api/students/list", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/teachers/list", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/parents/list", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/classes/list", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/academic-years/list", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [students, teachers, parents, classes, academicYears] = await Promise.all([
        studentsRes.json(),
        teachersRes.json(),
        parentsRes.json(),
        classesRes.json(),
        academicYearsRes.json(),
      ]);

      setStats({
        totalStudents: students.students?.length || 0,
        totalTeachers: teachers.teachers?.length || 0,
        totalParents: parents.parents?.length || 0,
        totalClasses: classes.classes?.length || 0,
        activeAcademicYear: academicYears.academicYears?.find((y: { isActive: boolean }) => y.isActive) || null,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (classId?: string) => {
    try {
      setGenerating(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reports/generate-term-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(classId ? { classId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Generation failed");
        return;
      }
      toast.success(`Generated ${data.summary?.generated ?? 0} report card(s)`);
      await loadReportCards(token!);
    } catch (err) {
      console.error("Generate error:", err);
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleReleaseAll = async () => {
    try {
      setReleasingAll(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reports/release", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(termId ? { termId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Release failed");
        return;
      }
      toast.success(`Released ${data.released ?? 0} report card(s)`);
      await loadReportCards(token!);
    } catch (err) {
      console.error("Release all error:", err);
      toast.error("Release failed");
    } finally {
      setReleasingAll(false);
    }
  };

  const handleReleaseClass = async (classId: string) => {
    try {
      setReleasingClassId(classId);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reports/release", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId, ...(termId ? { termId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Release failed");
        return;
      }
      toast.success(`Released ${data.released ?? 0} report card(s) for class`);
      await loadReportCards(token!);
    } catch (err) {
      console.error("Release class error:", err);
      toast.error("Release failed");
    } finally {
      setReleasingClassId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="ADMIN">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalGenerated = reportCards.length;
  const totalReleased = reportCards.filter((r) => r.isReleased).length;
  const totalLowAttendance = reportCards.filter((r) => r.lowAttendanceAlert).length;

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Reports & Analytics"
        description="Generate, review, and release term report cards"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Teachers</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Report Cards Generated</p>
          <p className="text-3xl font-bold text-gray-900">{totalGenerated}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Released to Parents</p>
          <p className="text-3xl font-bold text-green-700">{totalReleased}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Low Attendance Alerts</p>
          <p className="text-3xl font-bold text-amber-700">{totalLowAttendance}</p>
        </div>
      </div>

      {/* Current Academic Year */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Academic Year</h2>
        {stats.activeAcademicYear ? (
          <div className="bg-linear-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
            <p className="text-sm opacity-90">Active Session</p>
            <p className="text-2xl font-bold">{stats.activeAcademicYear.name}</p>
            <p className="text-sm mt-2 opacity-90">
              Term {stats.activeAcademicYear.term ?? ""} &bull;{" "}
              {stats.activeAcademicYear.startDate ? new Date(stats.activeAcademicYear.startDate).toLocaleDateString() : "—"} -{" "}
              {stats.activeAcademicYear.endDate ? new Date(stats.activeAcademicYear.endDate).toLocaleDateString() : "—"}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">No active academic year set</p>
            <p className="text-sm text-yellow-600 mt-1">Go to Academic Years to create and activate a session</p>
          </div>
        )}
      </div>

      {/* Report Card Management */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b bg-gray-50 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Report Card Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Close the active term first, then generate and release report cards
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleGenerate()}
              disabled={generating || releasingAll}
            >
              {generating ? "Generating…" : "Generate All for Current Term"}
            </Button>
            <Button
              onClick={handleReleaseAll}
              disabled={releasingAll || generating || totalGenerated === 0}
            >
              {releasingAll ? "Releasing…" : "Release All to Parents"}
            </Button>
          </div>
        </div>

        {classSummaries.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No report cards generated yet for the current term.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Generated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Released</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Low Attendance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pending</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classSummaries.map((cls) => (
                  <tr key={cls.classId} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{cls.className}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{cls.total}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold">{cls.released}</td>
                    <td className="px-4 py-3 text-right text-amber-700 font-semibold">{cls.lowAttendance}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{cls.total - cls.released}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(cls.classId)}
                          disabled={generating}
                        >
                          Regenerate
                        </Button>
                        {cls.released < cls.total && (
                          <Button
                            size="sm"
                            onClick={() => handleReleaseClass(cls.classId)}
                            disabled={releasingClassId === cls.classId}
                          >
                            {releasingClassId === cls.classId ? "…" : "Release"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrollment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Enrollment Report</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Student-Teacher Ratio</span>
              <span className="font-semibold">
                {stats.totalTeachers > 0
                  ? `${Math.round(stats.totalStudents / stats.totalTeachers)}:1`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Avg Students per Class</span>
              <span className="font-semibold">
                {stats.totalClasses > 0 ? Math.round(stats.totalStudents / stats.totalClasses) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Parent Coverage</span>
              <span className="font-semibold">
                {stats.totalStudents > 0
                  ? `${Math.round((stats.totalParents / stats.totalStudents) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Class Distribution</h3>
          <div className="bg-blue-50 rounded p-3 text-center">
            <p className="text-3xl font-bold text-blue-900">{stats.totalClasses}</p>
            <p className="text-xs text-blue-600 mt-1">Active Classes</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Report Release Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Total Generated</span>
              <span className="font-semibold">{totalGenerated}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Released</span>
              <span className="font-semibold text-green-700">{totalReleased}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Release</span>
              <span className="font-semibold text-orange-600">{totalGenerated - totalReleased}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-gray-600">Low Attendance Alerts</span>
              <span className="font-semibold text-amber-700">{totalLowAttendance}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

