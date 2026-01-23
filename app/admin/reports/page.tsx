"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader } from "@/app/components/UIComponents";

export default function AdminReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalClasses: 0,
    activeAcademicYear: null as any,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch various stats
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
        activeAcademicYear: academicYears.academicYears?.find((y: any) => y.isActive) || null,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
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

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Reports & Analytics"
        description="View school performance and statistics"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
            <div className="text-4xl">👨‍🎓</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Teachers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
            </div>
            <div className="text-4xl">👨‍🏫</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Parents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalParents}</p>
            </div>
            <div className="text-4xl">👪</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalClasses}</p>
            </div>
            <div className="text-4xl">🏫</div>
          </div>
        </div>
      </div>

      {/* Academic Year */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Academic Year</h2>
        {stats.activeAcademicYear ? (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Session</p>
                <p className="text-2xl font-bold">{stats.activeAcademicYear.name}</p>
                <p className="text-sm mt-2 opacity-90">
                  Term {stats.activeAcademicYear.term} • 
                  {new Date(stats.activeAcademicYear.startDate).toLocaleDateString()} - 
                  {new Date(stats.activeAcademicYear.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-5xl">📅</div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">No active academic year set</p>
            <p className="text-sm text-yellow-600 mt-1">Go to Academic Years to create and activate a session</p>
          </div>
        )}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📊 Enrollment Report</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Student-Teacher Ratio</span>
              <span className="font-semibold text-gray-900">
                {stats.totalTeachers > 0 
                  ? `${Math.round(stats.totalStudents / stats.totalTeachers)}:1`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Avg Students per Class</span>
              <span className="font-semibold text-gray-900">
                {stats.totalClasses > 0 
                  ? Math.round(stats.totalStudents / stats.totalClasses)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Parent Coverage</span>
              <span className="font-semibold text-gray-900">
                {stats.totalStudents > 0 
                  ? `${Math.round((stats.totalParents / stats.totalStudents) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🎓 Class Distribution</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Total classes across all levels (JSS1-SSS3)</p>
            <div className="bg-blue-50 rounded p-3 text-center">
              <p className="text-3xl font-bold text-blue-900">{stats.totalClasses}</p>
              <p className="text-xs text-blue-600 mt-1">Active Classes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📈 Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="font-semibold text-gray-900">
                {stats.totalStudents + stats.totalTeachers + stats.totalParents + 1}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">System Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">🚀 Advanced Reports (Coming Soon)</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
          <li>• Student Performance Analytics</li>
          <li>• Teacher Activity Reports</li>
          <li>• Class-wise Score Comparison</li>
          <li>• Subject Performance Trends</li>
          <li>• Attendance Reports</li>
          <li>• Parent Engagement Metrics</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
