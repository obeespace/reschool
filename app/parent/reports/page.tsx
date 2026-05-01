"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, LoadingSpinner, PageHeader, Select } from "@/app/components/UIComponents";

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

type ArchiveYear = { id: string; name: string; isActive: boolean };
type ArchiveTerm = {
  id: string;
  termNumber: number;
  academicYearId: string;
  academicYearName: string;
  isActive: boolean;
};

export default function ParentReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [academicYears, setAcademicYears] = useState<ArchiveYear[]>([]);
  const [terms, setTerms] = useState<ArchiveTerm[]>([]);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const fetchArchiveOptions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("/api/records/archive-options", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    setAcademicYears(data.academicYears || []);
    setTerms(data.terms || []);

    if (data.activeAcademicYearId) setSelectedAcademicYearId(data.activeAcademicYearId);
    if (data.activeTermId) setSelectedTermId(data.activeTermId);
  }, []);

  const fetchReports = useCallback(async (termId?: string, academicYearId?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const params = new URLSearchParams();
      if (termId) params.set("termId", termId);
      else if (academicYearId) params.set("academicYearId", academicYearId);
      const query = params.toString() ? `?${params.toString()}` : "";

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
      await fetchReports(selectedTermId || undefined, selectedAcademicYearId || undefined);
    } catch (error) {
      console.error("Parent print report error:", error);
      toast.error("Failed to record print");
    } finally {
      setPrintingId(null);
    }
  };

  useEffect(() => {
    void fetchArchiveOptions();
  }, [fetchArchiveOptions]);

  useEffect(() => {
    void fetchReports(selectedTermId || undefined, selectedAcademicYearId || undefined);
  }, [fetchReports, selectedAcademicYearId, selectedTermId]);

  const yearOptions = useMemo(
    () => [
      { value: "", label: "All Sessions" },
      ...academicYears.map((y) => ({ value: y.id, label: `${y.name}${y.isActive ? " (Active)" : ""}` })),
    ],
    [academicYears]
  );

  const termOptions = useMemo(() => {
    const source = selectedAcademicYearId
      ? terms.filter((t) => t.academicYearId === selectedAcademicYearId)
      : terms;
    return [
      { value: "", label: "All Terms" },
      ...source.map((t) => ({
        value: t.id,
        label: `${t.academicYearName} - ${t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term${t.isActive ? " (Active)" : ""}`,
      })),
    ];
  }, [selectedAcademicYearId, terms]);

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

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Session"
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setSelectedTermId("");
              }}
              options={yearOptions}
            />
            <Select
              label="Term"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              options={termOptions}
            />
          </div>
        </div>

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
