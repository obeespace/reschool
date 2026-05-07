"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

interface ClassDetails {
  _id: string;
  name: string;
  level: string;
  arm: string;
  classTeacher: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
  subjects: Array<{
    _id: string;
    name: string;
    code: string;
  }>;
  students: Array<{
    _id: string;
    fullName: string;
    registrationNumber: string;
    gender: string;
    dateOfBirth: string;
    parent: {
      fullName: string;
      email: string;
    } | null;
  }>;
  subjectTeachers: Array<{
    subject: {
      _id: string;
      name: string;
      code: string;
    };
    teacher: {
      _id: string;
      fullName: string;
      email: string;
    };
  }>;
  stats: {
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    totalSubjects: number;
    hasClassTeacher: boolean;
  };
}

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params?.id as string;

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "subjects">("overview");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClassDetails(data.class);
      } else {
        toast.error("Failed to load class details");
      }
    } catch (error) {
      toast.error("Error loading class details");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="ADMIN">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (!classDetails) {
    return (
      <DashboardLayout role="ADMIN">
        <div className="p-6 text-center">
          <p className="text-gray-500">Class not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title={classDetails.name}
        description={`${classDetails.level} · Class Details & Management`}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.5)]">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.totalStudents}</div>
            <div className="text-blue-100 text-xs font-medium uppercase tracking-wide">Total Students</div>
          </div>
          <div className="bg-linear-to-br from-violet-500 to-violet-600 rounded-2xl p-5 text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.5)]">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.maleStudents}</div>
            <div className="text-violet-100 text-xs font-medium uppercase tracking-wide">Male</div>
          </div>
          <div className="bg-linear-to-br from-pink-500 to-rose-500 rounded-2xl p-5 text-white shadow-[0_8px_24px_-8px_rgba(236,72,153,0.5)]">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.femaleStudents}</div>
            <div className="text-pink-100 text-xs font-medium uppercase tracking-wide">Female</div>
          </div>
          <div className="bg-linear-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.totalSubjects}</div>
            <div className="text-emerald-100 text-xs font-medium uppercase tracking-wide">Subjects</div>
          </div>
          <div className={`rounded-2xl p-5 text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)] col-span-2 sm:col-span-1 ${classDetails.stats.hasClassTeacher ? "bg-linear-to-br from-indigo-500 to-indigo-600" : "bg-linear-to-br from-slate-400 to-slate-500"}`}>
            <div className="text-3xl font-bold mb-1">{classDetails.stats.hasClassTeacher ? "✓" : "–"}</div>
            <div className="text-indigo-100 text-xs font-medium uppercase tracking-wide">Class Teacher</div>
          </div>
        </div>

        {/* Tab Panel */}
        <div className="bg-white rounded-2xl shadow-[0_8px_20px_-16px_rgba(15,23,42,0.32)]">
          {/* Tab Bar */}
          <div className="flex gap-1 p-1.5 border-b border-slate-100">
            {(["overview", "students", "subjects"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-linear-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)]"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab === "overview" && "Overview"}
                {tab === "students" && `Students (${classDetails.stats.totalStudents})`}
                {tab === "subjects" && `Subjects & Teachers (${classDetails.stats.totalSubjects})`}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {/* ── Overview Tab ─────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* Class Teacher */}
                <div className="bg-slate-50/60 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Class Teacher</p>
                  {classDetails.classTeacher ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)]">
                          {classDetails.classTeacher.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{classDetails.classTeacher.fullName}</p>
                          <p className="text-xs text-slate-500">{classDetails.classTeacher.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/teachers/${classDetails.classTeacher?._id}`)}
                        className="px-4 py-2 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200 w-full sm:w-auto text-center"
                      >
                        View Profile
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-5 py-4">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="font-semibold text-amber-800 text-sm">No class teacher assigned</p>
                        <p className="text-xs text-amber-600 mt-0.5">Assign one from the Teachers section</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gender Distribution */}
                <div className="bg-slate-50/60 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Gender Distribution</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.2)]">
                      <div className="text-2xl font-bold text-blue-600">{classDetails.stats.maleStudents}</div>
                      <div className="text-sm text-slate-600 mt-0.5">Male Students</div>
                      <div className="text-xs text-blue-500 mt-1">
                        {classDetails.stats.totalStudents > 0
                          ? Math.round((classDetails.stats.maleStudents / classDetails.stats.totalStudents) * 100)
                          : 0}% of class
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.2)]">
                      <div className="text-2xl font-bold text-pink-500">{classDetails.stats.femaleStudents}</div>
                      <div className="text-sm text-slate-600 mt-0.5">Female Students</div>
                      <div className="text-xs text-pink-400 mt-1">
                        {classDetails.stats.totalStudents > 0
                          ? Math.round((classDetails.stats.femaleStudents / classDetails.stats.totalStudents) * 100)
                          : 0}% of class
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-50/60 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Quick Actions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Add Students", sub: "Enroll new students to this class", icon: "👤", href: "/admin/students", color: "indigo" },
                      { label: "Assign Teachers", sub: "Link subjects and teachers", icon: "🎓", href: "/admin/teachers", color: "violet" },
                      { label: "View Reports", sub: "Academic performance & analytics", icon: "📊", href: "/admin/reports", color: "emerald" },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => router.push(action.href)}
                        className="bg-white rounded-xl p-4 text-left shadow-[0_4px_12px_-8px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-all duration-200 group"
                      >
                        <div className="text-2xl mb-2">{action.icon}</div>
                        <div className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{action.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{action.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Students Tab ──────────────────────────────────────── */}
            {activeTab === "students" && (
              <div>
                {classDetails.students.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-semibold mb-1">No students enrolled yet</p>
                    <p className="text-slate-400 text-sm mb-6">Students assigned to this class will appear here</p>
                    <button
                      onClick={() => router.push("/admin/students")}
                      className="px-5 py-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200"
                    >
                      Go to Students
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/80">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 rounded-tl-xl">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reg. No.</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gender</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Parent / Guardian</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 rounded-tr-xl"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classDetails.students.map((student, index) => (
                          <tr key={student._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3.5 text-slate-400 font-medium">{index + 1}</td>
                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-semibold">{student.registrationNumber}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-800">{student.fullName}</td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                student.gender?.toLowerCase() === "male"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-pink-50 text-pink-600"
                              }`}>
                                {student.gender || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {student.parent ? (
                                <div>
                                  <div className="font-medium text-slate-700">{student.parent.fullName}</div>
                                  <div className="text-xs text-slate-400">{student.parent.email}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Not assigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => router.push("/admin/students")}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Subjects & Teachers Tab ───────────────────────────── */}
            {activeTab === "subjects" && (
              <div>
                {classDetails.subjectTeachers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-semibold mb-1">No subjects assigned yet</p>
                    <p className="text-slate-400 text-sm mb-6">Subjects linked to this class will appear here</p>
                    <button
                      onClick={() => router.push("/admin/subjects")}
                      className="px-5 py-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200"
                    >
                      Go to Subjects
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {classDetails.subjectTeachers.map((item) => (
                      <div
                        key={item.subject._id}
                        className="bg-slate-50/60 rounded-2xl p-5 hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,0.25)] transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-bold text-slate-800">{item.subject.name}</p>
                            {item.subject.code && (
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{item.subject.code}</p>
                            )}
                          </div>
                          <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {item.teacher.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{item.teacher.fullName}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/admin/teachers/${item.teacher._id}`)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0 transition-colors"
                          >
                            Profile →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
