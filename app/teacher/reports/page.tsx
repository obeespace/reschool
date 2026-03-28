"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, LoadingSpinner, PageHeader, Select } from "@/app/components/UIComponents";

type TeacherReport = {
  id: string;
  studentId: string;
  classId: string;
  className: string;
  termNumber: number;
  yearLabel: string;
  averageScore: number;
  classRanking: number | null;
  classSize: number | null;
  attendancePercentage: number | null;
  lowAttendanceAlert: boolean;
  isReleased: boolean;
  printCount: number;
};

export default function TeacherReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<TeacherReport[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [printingId, setPrintingId] = useState<string | null>(null);

  const fetchReports = useCallback(async (classId?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
      const response = await fetch(`/api/reports/list${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to load reports");
        return;
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("Load teacher reports error:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handlePrint = async (reportId: string) => {
    try {
      setPrintingId(reportId);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reports/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportId, reason: "Teacher report print" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to record print");
        return;
      }

      toast.success("Report print recorded");
      await fetchReports(selectedClassId || undefined);
    } catch (error) {
      console.error("Teacher print report error:", error);
      toast.error("Failed to record print");
    } finally {
      setPrintingId(null);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const classOptions = useMemo(() => {
    const byId = new Map<string, string>();
    reports.forEach((report) => {
      if (report.classId) byId.set(report.classId, report.className || "Class");
    });
    return [
      { value: "", label: "All Classes" },
      ...Array.from(byId.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [reports]);

  const visibleReports = useMemo(() => {
    if (!selectedClassId) return reports;
    return reports.filter((report) => report.classId === selectedClassId);
  }, [reports, selectedClassId]);

  if (loading) {
    return (
      <DashboardLayout role="TEACHER">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader title="Report Visibility" description="View released report cards for your assigned classes" />

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-4 max-w-md">
          <Select
            label="Filter by Class"
            value={selectedClassId}
            onChange={(e) => {
              const nextClassId = e.target.value;
              setSelectedClassId(nextClassId);
            }}
            options={classOptions}
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Released Reports</h2>
            <span className="text-sm text-gray-500">{visibleReports.length} record(s)</span>
          </div>

          {visibleReports.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No released reports available for your classes.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Session/Term</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Average</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Rank</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Attendance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Prints</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{report.className}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{report.yearLabel} - T{report.termNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{Number(report.averageScore || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {report.classRanking ? `${report.classRanking}/${report.classSize || "-"}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="text-gray-900">{report.attendancePercentage == null ? "-" : `${Number(report.attendancePercentage).toFixed(2)}%`}</div>
                        {report.lowAttendanceAlert && (
                          <div className="text-xs font-medium text-amber-700">Low attendance</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{report.printCount || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handlePrint(report.id)}
                          disabled={printingId === report.id}
                        >
                          {printingId === report.id ? "Please wait..." : "Print"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
