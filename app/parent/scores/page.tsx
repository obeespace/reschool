"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner, Select } from "@/app/components/UIComponents";

type ArchiveYear = { id: string; name: string; isActive: boolean };
type ArchiveTerm = {
  id: string;
  termNumber: number;
  academicYearId: string;
  academicYearName: string;
  isActive: boolean;
};

const TERM_NAMES = ["", "First", "Second", "Third"];

function ParentScoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [wards, setWards] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState("");
  const [archiveYears, setArchiveYears] = useState<ArchiveYear[]>([]);
  const [archiveTerms, setArchiveTerms] = useState<ArchiveTerm[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");

  const filteredTerms = useMemo(
    () => archiveTerms.filter((t) => !selectedSessionId || t.academicYearId === selectedSessionId),
    [archiveTerms, selectedSessionId]
  );

  const selectedTermLabel = useMemo(() => {
    const t = archiveTerms.find((t) => t.id === selectedTermId);
    if (!t) return "";
    return `${TERM_NAMES[t.termNumber] || "Term " + t.termNumber} Term — ${t.academicYearName}`;
  }, [archiveTerms, selectedTermId]);

  const fetchScores = useCallback(async (wardId: string, termId: string) => {
    if (!wardId || !termId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/scores/view?studentId=${wardId}&termId=${termId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setScores(data.scores || []);
      }
    } catch (error) {
      console.error("Error fetching scores:", error);
    }
  }, []);

  const fetchWards = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/parents/ward-scores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const wardList = (data.wards || []).map((w: any) => ({ _id: w.studentId, fullName: w.fullName }));
        setWards(wardList);
        return wardList;
      }
    } catch (error) {
      console.error("Error fetching wards:", error);
    }
    return [];
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const init = async () => {
      const studentParam = searchParams.get("student");

      const [archiveRes, wardList] = await Promise.all([
        fetch("/api/records/archive-options", { headers: { Authorization: `Bearer ${token}` } }),
        fetchWards(),
      ]);

      let activeTermId = "";

      if (archiveRes.ok) {
        const data = await archiveRes.json();
        setArchiveYears(data.academicYears || []);
        setArchiveTerms(data.terms || []);
        if (data.activeAcademicYearId) { setSelectedSessionId(data.activeAcademicYearId); }
        if (data.activeTermId) { setSelectedTermId(data.activeTermId); activeTermId = data.activeTermId; }
      }

      const ward = studentParam || (wardList.length > 0 ? wardList[0]._id : "");
      if (ward) {
        setSelectedWard(ward);
        if (activeTermId) fetchScores(ward, activeTermId);
      }

      setIsLoading(false);
    };

    init();
  }, [router, searchParams, fetchWards, fetchScores]);

  // Refetch when ward or term selection changes (skip the first render that fires on mount)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (selectedWard && selectedTermId) {
      fetchScores(selectedWard, selectedTermId);
    }
  }, [selectedWard, selectedTermId]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateGrade = (total: number) => {
    if (total >= 70) return { grade: "A", color: "text-green-600" };
    if (total >= 60) return { grade: "B", color: "text-blue-600" };
    if (total >= 50) return { grade: "C", color: "text-yellow-600" };
    if (total >= 40) return { grade: "D", color: "text-orange-600" };
    return { grade: "F", color: "text-red-600" };
  };

  const selectedWardData = wards.find((w) => w._id === selectedWard);
  const totalScores = scores.reduce((sum, s) => sum + (s.total || 0), 0);
  const averageScore = scores.length > 0 ? (totalScores / scores.length).toFixed(1) : "0";

  if (isLoading) {
    return (
      <DashboardLayout role="PARENT">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="PARENT">
      <PageHeader
        title="Scores & Performance"
        description="View your ward's academic performance"
      />

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Select
              label="Select Ward"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              options={wards.map((w) => ({
                value: w._id,
                label: w.fullName,
              }))}
            />

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

        {selectedWardData && (
          <>
            {/* Summary Card */}
            <div className="bg-linear-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-indigo-200 text-sm">Student Name</div>
                  <div className="text-2xl font-bold mt-1">{selectedWardData.fullName}</div>
                  <div className="text-indigo-200 text-sm mt-1">{selectedTermLabel}</div>
                </div>
                <div>
                  <div className="text-indigo-200 text-sm">Total Subjects</div>
                  <div className="text-4xl font-bold mt-1">{scores.length}</div>
                </div>
                <div>
                  <div className="text-indigo-200 text-sm">Average Score</div>
                  <div className="text-4xl font-bold mt-1">{averageScore}%</div>
                  <div className={`text-xl font-bold mt-1 ${calculateGrade(parseFloat(averageScore)).color.replace("text-", "text-white/90 text-")}`}>
                    Grade: {calculateGrade(parseFloat(averageScore)).grade}
                  </div>
                </div>
              </div>
            </div>

            {/* Scores Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-xl font-bold">Subject Scores — {selectedTermLabel}</h2>
              </div>

              {scores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Classwork
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Homework
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Test
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Exam
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scores.map((score) => {
                        const { grade, color } = calculateGrade(score.total ?? 0);
                        return (
                          <tr key={score._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{score.subjectName || score.subjectId?.name}</td>
                            <td className="px-6 py-4 text-center">{score.classwork ?? "-"}</td>
                            <td className="px-6 py-4 text-center">{score.homework ?? "-"}</td>
                            <td className="px-6 py-4 text-center">{score.test ?? "-"}</td>
                            <td className="px-6 py-4 text-center font-semibold">{score.exam ?? "-"}</td>
                            <td className="px-6 py-4 text-center font-bold text-lg">
                              {score.total ?? "-"}
                            </td>
                            <td className={`px-6 py-4 text-center font-bold text-xl ${color}`}>
                              {grade}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2">
                      <tr>
                        <td colSpan={5} className="px-6 py-4 font-bold text-right">
                          Average:
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-xl">
                          {averageScore}
                        </td>
                        <td className={`px-6 py-4 text-center font-bold text-xl ${calculateGrade(parseFloat(averageScore)).color}`}>
                          {calculateGrade(parseFloat(averageScore)).grade}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-semibold">No scores available</p>
                  <p className="text-sm mt-2">
                    No scores found for the selected term.
                  </p>
                </div>
              )}
            </div>

            {/* Performance Insights */}
            {scores.length > 0 && (
              <div className="mt-6 bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                <h3 className="font-semibold text-blue-900 mb-3">Performance Insights</h3>
                <div className="space-y-2 text-blue-800 text-sm">
                  <p>
                    • Best Subject:{" "}
                    <span className="font-semibold">
                      {scores.reduce((best, current) =>
                        (current.total ?? 0) > (best.total ?? 0) ? current : best
                      ).subjectName} ({scores.reduce((best, current) =>
                        (current.total ?? 0) > (best.total ?? 0) ? current : best
                      ).total} marks)
                    </span>
                  </p>
                  <p>
                    • Needs Improvement:{" "}
                    <span className="font-semibold">
                      {scores.reduce((worst, current) =>
                        (current.total ?? 0) < (worst.total ?? 0) ? current : worst
                      ).subjectName} ({scores.reduce((worst, current) =>
                        (current.total ?? 0) < (worst.total ?? 0) ? current : worst
                      ).total} marks)
                    </span>
                  </p>
                  <p>
                    • Overall Performance:{" "}
                    <span className="font-semibold">
                      {parseFloat(averageScore) >= 70 ? "Excellent! Keep up the great work!" :
                       parseFloat(averageScore) >= 60 ? "Good performance. Room for improvement." :
                       parseFloat(averageScore) >= 50 ? "Fair. More effort needed in weak subjects." :
                       "Needs significant improvement. Consider extra tutoring."}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedWardData && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            <p className="text-lg">No wards found</p>
            <p className="text-sm mt-2">Please contact the school administrator.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentScores() {
  return (
    <Suspense fallback={<div className="p-6"><LoadingSpinner /></div>}>
      <ParentScoresContent />
    </Suspense>
  );
}
