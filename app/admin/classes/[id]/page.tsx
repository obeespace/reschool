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
        description={`Class Details & Management - ${classDetails.level}`}
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.totalStudents}</div>
            <div className="text-blue-100 text-sm">Total Students</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.maleStudents}</div>
            <div className="text-purple-100 text-sm">Male Students</div>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.femaleStudents}</div>
            <div className="text-pink-100 text-sm">Female Students</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl font-bold mb-1">{classDetails.stats.totalSubjects}</div>
            <div className="text-green-100 text-sm">Subjects</div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-3xl font-bold mb-1">
              {classDetails.stats.hasClassTeacher ? "✓" : "✗"}
            </div>
            <div className="text-indigo-100 text-sm">Class Teacher</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === "overview"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === "students"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                👨‍🎓 Students ({classDetails.stats.totalStudents})
              </button>
              <button
                onClick={() => setActiveTab("subjects")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === "subjects"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📚 Subjects & Teachers ({classDetails.stats.totalSubjects})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Class Teacher */}
                <div className="border-2 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="text-2xl">👨‍🏫</span> Class Teacher
                  </h3>
                  {classDetails.classTeacher ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                      <div>
                        <p className="font-semibold text-lg">{classDetails.classTeacher.fullName}</p>
                        <p className="text-sm text-gray-600">{classDetails.classTeacher.email}</p>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/teachers/${classDetails.classTeacher?._id}`)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        View Profile
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800">⚠️ No class teacher assigned</p>
                      <p className="text-sm text-yellow-600 mt-2">Assign a class teacher from the Teachers section</p>
                    </div>
                  )}
                </div>

                {/* Gender Distribution */}
                <div className="border-2 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Gender Distribution</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-3xl font-bold text-blue-600">{classDetails.stats.maleStudents}</div>
                      <div className="text-sm text-blue-800">Male Students</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {classDetails.stats.totalStudents > 0 
                          ? Math.round((classDetails.stats.maleStudents / classDetails.stats.totalStudents) * 100)
                          : 0}% of class
                      </div>
                    </div>
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                      <div className="text-3xl font-bold text-pink-600">{classDetails.stats.femaleStudents}</div>
                      <div className="text-sm text-pink-800">Female Students</div>
                      <div className="text-xs text-pink-600 mt-1">
                        {classDetails.stats.totalStudents > 0
                          ? Math.round((classDetails.stats.femaleStudents / classDetails.stats.totalStudents) * 100)
                          : 0}% of class
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-2 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <button
                      onClick={() => router.push("/admin/students")}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                    >
                      <div className="text-2xl mb-2">➕</div>
                      <div className="font-semibold">Add Students</div>
                      <div className="text-sm text-gray-600">Enroll new students to this class</div>
                    </button>
                    <button
                      onClick={() => router.push("/admin/teachers")}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                    >
                      <div className="text-2xl mb-2">👨‍🏫</div>
                      <div className="font-semibold">Assign Teachers</div>
                      <div className="text-sm text-gray-600">Link subjects and teachers</div>
                    </button>
                    <button
                      onClick={() => router.push("/admin/reports")}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                    >
                      <div className="text-2xl mb-2">📊</div>
                      <div className="font-semibold">View Reports</div>
                      <div className="text-sm text-gray-600">Academic performance & analytics</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Students Tab */}
            {activeTab === "students" && (
              <div>
                {classDetails.students.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl block mb-4">👨‍🎓</span>
                    <p className="text-gray-500 text-lg mb-2">No students in this class yet</p>
                    <button
                      onClick={() => router.push("/admin/students")}
                      className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Add Students
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reg. Number</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Full Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Gender</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parent/Guardian</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classDetails.students.map((student, index) => (
                          <tr key={student._id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium">{student.registrationNumber}</td>
                            <td className="px-4 py-3 text-sm font-medium">{student.fullName}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                student.gender === "MALE" 
                                  ? "bg-blue-100 text-blue-700" 
                                  : "bg-pink-100 text-pink-700"
                              }`}>
                                {student.gender}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {student.parent ? (
                                <div>
                                  <div className="font-medium">{student.parent.fullName}</div>
                                  <div className="text-xs text-gray-500">{student.parent.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not assigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => router.push(`/admin/students`)}
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                              >
                                View
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

            {/* Subjects Tab */}
            {activeTab === "subjects" && (
              <div>
                {classDetails.subjectTeachers.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl block mb-4">📚</span>
                    <p className="text-gray-500 text-lg mb-2">No subjects assigned yet</p>
                    <button
                      onClick={() => router.push("/admin/subjects")}
                      className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Link Subjects
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {classDetails.subjectTeachers.map((item) => (
                      <div key={item.subject._id} className="border-2 rounded-lg p-6 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold">
                              {item.subject.name}
                              <span className="text-sm text-gray-500 ml-2">({item.subject.code})</span>
                            </h3>
                            <div className="mt-3 flex items-center gap-3">
                              <span className="text-sm text-gray-600">Teacher:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.teacher.fullName}</span>
                                <button
                                  onClick={() => router.push(`/admin/teachers/${item.teacher._id}`)}
                                  className="text-xs text-indigo-600 hover:text-indigo-700"
                                >
                                  View Profile →
                                </button>
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            Active
                          </span>
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
