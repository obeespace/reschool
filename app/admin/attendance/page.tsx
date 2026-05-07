"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Select, Button } from "@/app/components/UIComponents";

interface AttendanceStats {
  totalMarked: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

interface ByDateRow {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface ClassOption {
  id: string;
  level: string;
  arm: string;
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [byDate, setByDate] = useState<ByDateRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data.classes) ? data.classes : []);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchDashboard = useCallback(
    async (classId?: string) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        setLoading(true);
        const url = classId
          ? `/api/attendance/dashboard?classId=${encodeURIComponent(classId)}`
          : "/api/attendance/dashboard";

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }

        if (!res.ok) {
          toast.error("Failed to load attendance data");
          return;
        }

        const data = await res.json();
        setStats(data.stats ?? null);
        const rows: ByDateRow[] = Array.isArray(data.byDate)
          ? [...data.byDate].sort((a, b) => b.date.localeCompare(a.date))
          : [];
        setByDate(rows);
      } catch {
        toast.error("Error loading attendance");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchClasses(token);
    fetchDashboard();
  }, [fetchClasses, fetchDashboard, router]);

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    fetchDashboard(classId || undefined);
  };

  const statItems = stats
    ? [
        { label: "Attendance Rate", value: `${stats.attendanceRate}%`, color: stats.attendanceRate >= 80 ? "text-green-600" : stats.attendanceRate >= 60 ? "text-yellow-600" : "text-red-600" },
        { label: "Total Records", value: stats.totalMarked, color: "text-gray-900" },
        { label: "Present", value: stats.present, color: "text-green-600" },
        { label: "Absent", value: stats.absent, color: "text-red-600" },
        { label: "Late", value: stats.late, color: "text-yellow-600" },
        { label: "Excused", value: stats.excused, color: "text-blue-600" },
      ]
    : [];

  const classOptions = [
    { value: "", label: "All Classes" },
    ...classes.map((c) => ({ value: c.id, label: `${c.level} ${c.arm}` })),
  ];

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Attendance Dashboard"
        description="School-wide attendance overview for the current term"
        action={
          <Button variant="secondary" onClick={() => fetchDashboard(selectedClass || undefined)}>
            Refresh
          </Button>
        }
      />

      <div className="px-4 sm:px-6 pb-6 pt-4 sm:pt-6">
        {/* Filter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-full sm:w-72">
            <Select
              label="Filter by Class"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classOptions}
            />
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="text-gray-500 py-8 text-center">Loading attendance data…</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statItems.map((item) => (
                <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-gray-500 font-medium mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Attendance by Date</h2>
              {byDate.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b text-gray-700">
                        <tr>
                          {["Date", "Total", "Present", "Absent", "Late", "Excused", "Rate"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {byDate.map((row) => {
                          const rate = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                          return (
                            <tr key={row.date} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{row.date}</td>
                              <td className="px-4 py-3 text-gray-600">{row.total}</td>
                              <td className="px-4 py-3 text-green-600 font-semibold">{row.present}</td>
                              <td className="px-4 py-3 text-red-600 font-semibold">{row.absent}</td>
                              <td className="px-4 py-3 text-yellow-600 font-semibold">{row.late}</td>
                              <td className="px-4 py-3 text-blue-600 font-semibold">{row.excused}</td>
                              <td className="px-4 py-3">
                                <span className={rate >= 80 ? "text-green-600 font-bold" : rate >= 60 ? "text-yellow-600 font-bold" : "text-red-600 font-bold"}>
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 py-8 text-center bg-white rounded-xl border border-gray-200">
                  No attendance records found for this selection.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-500 py-8 text-center bg-white rounded-xl border border-gray-200">
            No attendance data available. Teachers need to mark attendance first.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
