"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, GraduationCap, UsersRound, School, TrendingUp, Mail, Phone, MapPin } from "lucide-react";
import DashboardLayout from "@/app/components/Sidebar";
import { StatCard, PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

interface SchoolStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  state: string;
  teachers: number;
  parents: number;
  students: number;
  totalUsers: number;
  createdAt: string;
}

interface GlobalStats {
  totalSchools: number;
  totalTeachers: number;
  totalParents: number;
  totalStudents: number;
  totalAdmins: number;
  totalUsers: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "ADMIN" || payload.schoolId) {
        toast.error("Access denied. Super admin only.");
        router.push("/login");
        return;
      }
    } catch (error) {
      router.push("/login");
      return;
    }

    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools);
        setGlobalStats(data.globalStats);
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Connection error");
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

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Super Admin Dashboard"
        description="Global analytics across all schools"
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Global Stats */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Schools"
              value={globalStats?.totalSchools || 0}
              icon={School}
              color="indigo"
            />
            <StatCard
              title="Teachers"
              value={globalStats?.totalTeachers || 0}
              icon={Users}
              color="green"
            />
            <StatCard
              title="Students"
              value={globalStats?.totalStudents || 0}
              icon={GraduationCap}
              color="blue"
            />
            <StatCard
              title="Parents"
              value={globalStats?.totalParents || 0}
              icon={UsersRound}
              color="purple"
            />
            <StatCard
              title="Admins"
              value={globalStats?.totalAdmins || 0}
              icon={Users}
              color="orange"
            />
            <StatCard
              title="Total Users"
              value={globalStats?.totalUsers || 0}
              icon={TrendingUp}
              color="pink"
            />
          </div>
        </div>

        {/* Schools List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Schools ({schools.length})</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">School Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">Teachers</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">Students</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">Parents</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">Total Users</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schools.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{school.name}</div>
                        <div className="text-sm text-gray-500">{school.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={16} className="text-gray-400" />
                          {school.state}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Phone size={14} className="text-gray-400" />
                          {school.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg">
                          <span className="text-sm font-semibold text-indigo-700">{school.teachers}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                          <span className="text-sm font-semibold text-green-700">{school.students}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                          <span className="text-sm font-semibold text-purple-700">{school.parents}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900">
                        {school.totalUsers}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(school.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {schools.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <School size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No schools registered yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
