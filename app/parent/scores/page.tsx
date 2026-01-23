"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner, Select } from "@/app/components/UIComponents";

export default function ParentScores() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [wards, setWards] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("1");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const studentParam = searchParams.get("student");
    if (studentParam) {
      setSelectedWard(studentParam);
    }

    fetchWardScores();
  }, [router, searchParams]);

  const fetchWardScores = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/parents/ward-scores", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWards(data.students || []);
        setScores(data.scores || []);
        
        if (!selectedWard && data.students.length > 0) {
          setSelectedWard(data.students[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching scores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredScores = scores.filter(
    (score) =>
      score.studentId._id === selectedWard &&
      score.term === parseInt(selectedTerm)
  );

  const calculateGrade = (total: number) => {
    if (total >= 70) return { grade: "A", color: "text-green-600" };
    if (total >= 60) return { grade: "B", color: "text-blue-600" };
    if (total >= 50) return { grade: "C", color: "text-yellow-600" };
    if (total >= 40) return { grade: "D", color: "text-orange-600" };
    return { grade: "F", color: "text-red-600" };
  };

  const selectedWardData = wards.find((w) => w._id === selectedWard);
  const totalScores = filteredScores.reduce((sum, s) => sum + s.total, 0);
  const averageScore = filteredScores.length > 0 ? (totalScores / filteredScores.length).toFixed(2) : "0";

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
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Select Ward"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              options={wards.map((w) => ({
                value: w._id,
                label: `${w.fullName} - ${w.currentClassId?.level} ${w.currentClassId?.arm}`,
              }))}
            />

            <Select
              label="Select Term"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              options={[
                { value: "1", label: "First Term" },
                { value: "2", label: "Second Term" },
                { value: "3", label: "Third Term" },
              ]}
            />
          </div>
        </div>

        {selectedWardData && (
          <>
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-indigo-200 text-sm">Student Name</div>
                  <div className="text-2xl font-bold mt-1">{selectedWardData.fullName}</div>
                  <div className="text-indigo-200 text-sm mt-1">
                    {selectedWardData.currentClassId?.level} {selectedWardData.currentClassId?.arm}
                  </div>
                </div>
                <div>
                  <div className="text-indigo-200 text-sm">Total Subjects</div>
                  <div className="text-4xl font-bold mt-1">{filteredScores.length}</div>
                </div>
                <div>
                  <div className="text-indigo-200 text-sm">Average Score</div>
                  <div className="text-4xl font-bold mt-1">{averageScore}%</div>
                  <div className={`text-xl font-bold mt-1 ${calculateGrade(parseFloat(averageScore)).color}`}>
                    Grade: {calculateGrade(parseFloat(averageScore)).grade}
                  </div>
                </div>
              </div>
            </div>

            {/* Scores Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-xl font-bold">Subject Scores - Term {selectedTerm}</h2>
              </div>

              {filteredScores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Classwork<br/>(10)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Homework<br/>(10)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Extra<br/>(10)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Test<br/>(30)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Exam<br/>(60)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Total<br/>(100)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredScores.map((score) => {
                        const { grade, color } = calculateGrade(score.total);
                        return (
                          <tr key={score._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{score.subjectId?.name}</td>
                            <td className="px-6 py-4 text-center">{score.classwork}</td>
                            <td className="px-6 py-4 text-center">{score.homework}</td>
                            <td className="px-6 py-4 text-center">{score.extracurricular}</td>
                            <td className="px-6 py-4 text-center">{score.test}</td>
                            <td className="px-6 py-4 text-center font-semibold">{score.exam}</td>
                            <td className="px-6 py-4 text-center font-bold text-lg">
                              {score.total}
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
                        <td colSpan={6} className="px-6 py-4 font-bold text-right">
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
                    Scores for Term {selectedTerm} haven't been uploaded yet.
                  </p>
                </div>
              )}
            </div>

            {/* Performance Insights */}
            {filteredScores.length > 0 && (
              <div className="mt-6 bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                <h3 className="font-semibold text-blue-900 mb-3">📊 Performance Insights</h3>
                <div className="space-y-2 text-blue-800 text-sm">
                  <p>
                    • Best Subject:{" "}
                    <span className="font-semibold">
                      {filteredScores.reduce((best, current) => 
                        current.total > best.total ? current : best
                      ).subjectId?.name} ({filteredScores.reduce((best, current) => 
                        current.total > best.total ? current : best
                      ).total} marks)
                    </span>
                  </p>
                  <p>
                    • Needs Improvement:{" "}
                    <span className="font-semibold">
                      {filteredScores.reduce((worst, current) => 
                        current.total < worst.total ? current : worst
                      ).subjectId?.name} ({filteredScores.reduce((worst, current) => 
                        current.total < worst.total ? current : worst
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
