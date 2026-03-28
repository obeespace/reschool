"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, LoadingSpinner, PageHeader } from "@/app/components/UIComponents";

type ParentReport = {
  id: string;
  className: string;
  termNumber: number;
  yearLabel: string;
  totalScore: number;
  averageScore: number;
  classRanking: number | null;
  classSize: number | null;
  attendancePercentage: number | null;
  lowAttendanceAlert: boolean;
  printCount: number;
  isReleased: boolean;
};

export default function ParentReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/reports/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to load reports");
        return;
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("Load parent reports error:", error);
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
        body: JSON.stringify({ reportId, reason: "Parent requested report view/print" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to record print");
        return;
      }

      toast.success("Report print recorded");
      await fetchReports();
    } catch (error) {
      console.error("Parent print report error:", error);
      toast.error("Failed to record print");
    } finally {
      setPrintingId(null);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <DashboardLayout role="PARENT">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="PARENT">
      <PageHeader title="Reports" description="View released report cards for your ward(s)" />

      <div className="p-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Released Report Cards</h2>
            <span className="text-sm text-gray-500">{reports.length} record(s)</span>
          </div>

          {reports.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No released report cards available yet.</div>
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
                  {reports.map((report) => (
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
