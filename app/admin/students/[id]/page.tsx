"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, Input, LoadingSpinner, PageHeader, Select } from "@/app/components/UIComponents";

type LifecycleRecord = {
  admissionDate: string | null;
  admissionClass: string | null;
  currentClass: string | null;
  currentStatus: string;
  milestones: string[];
  graduationDate: string | null;
  certificateId: string | null;
  certificationStatus: string;
  suspensionCount: number;
  withdrawalReason: string | null;
  overallPerformance: {
    note?: string;
  };
};

type TranscriptSubject = {
  subjectId?: string;
  subjectName?: string;
  name?: string;
  total?: number;
  score?: number;
  exam?: number;
  test?: number;
  classwork?: number;
  homework?: number;
  extracurricular?: number;
};

type TranscriptEntry = {
  _id?: string;
  sessionId: string;
  termId: string;
  termNumber: number;
  yearLabel: string;
  className?: string;
  subjects: TranscriptSubject[];
  totalScore: number;
  averageScore: number;
  classRanking?: number | null;
  classSize?: number | null;
  generatedDate?: string;
};

type CertificateStatus = {
  eligible: boolean;
  eligibilityCode: string;
  eligibilityReason: string;
  hasCertificate: boolean;
  signed: boolean;
};

type StudentSummary = {
  id: string;
  fullName: string;
  admissionNumber: string;
};

type RecommendationHistoryItem = {
  id: string;
  studentId: string;
  studentName: string;
  level: "JSS3" | "SSS3";
  topChoice: string | null;
  recommendations: Array<{ path?: string; cluster?: string; confidence?: number }>;
  summary: { message?: string; scoreSampleSize?: number; model?: string };
  requestedAt: string;
};

export default function AdminStudentRecordPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [recommendationHistory, setRecommendationHistory] = useState<RecommendationHistoryItem[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState<"JSS3" | "SSS3" | null>(null);
  const [form, setForm] = useState({
    admissionDate: "",
    admissionClass: "",
    currentClass: "",
    currentStatus: "ACTIVE",
    milestonesText: "",
    graduationDate: "",
    certificationStatus: "PENDING",
    suspensionCount: "0",
    withdrawalReason: "",
    performanceNote: "",
  });

  const loadRecord = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const [lifecycleRes, transcriptRes, certificateRes] = await Promise.all([
        fetch(`/api/students/${studentId}/lifecycle-record`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/students/${studentId}/transcript`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/students/${studentId}/certificate-status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const lifecycleData = lifecycleRes.ok ? await lifecycleRes.json() : null;
      const transcriptData = transcriptRes.ok ? await transcriptRes.json() : null;
      const certificateData = certificateRes.ok ? await certificateRes.json() : null;

      const resolvedStudent = transcriptData?.student || lifecycleData?.student || certificateData?.student || null;
      setStudent(resolvedStudent);
      setTranscript(transcriptData?.transcript || []);
      setCertificateStatus(certificateData?.status || null);

      const lifecycle = lifecycleData?.lifecycle as LifecycleRecord | null;
      setForm({
        admissionDate: lifecycle?.admissionDate ? new Date(lifecycle.admissionDate).toISOString().slice(0, 10) : "",
        admissionClass: lifecycle?.admissionClass || "",
        currentClass: lifecycle?.currentClass || "",
        currentStatus: lifecycle?.currentStatus || "ACTIVE",
        milestonesText: Array.isArray(lifecycle?.milestones) ? lifecycle!.milestones.join("\n") : "",
        graduationDate: lifecycle?.graduationDate ? new Date(lifecycle.graduationDate).toISOString().slice(0, 10) : "",
        certificationStatus: lifecycle?.certificationStatus || "PENDING",
        suspensionCount: String(lifecycle?.suspensionCount || 0),
        withdrawalReason: lifecycle?.withdrawalReason || "",
        performanceNote: lifecycle?.overallPerformance?.note || "",
      });
    } catch (error) {
      console.error("Load student academic record error:", error);
      toast.error("Failed to load student academic record");
    } finally {
      setLoading(false);
    }
  }, [router, studentId]);

  const loadRecommendationHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/ai/recommendation-history?studentId=${encodeURIComponent(studentId)}&limit=12`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      setRecommendationHistory(Array.isArray(data?.history) ? data.history : []);
    } catch (error) {
      console.error("Load recommendation history error:", error);
    }
  }, [studentId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}") as { role?: string };

    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    if (!studentId) {
      router.push("/admin/students");
      return;
    }

    loadRecord();
    loadRecommendationHistory();
  }, [loadRecord, loadRecommendationHistory, router, studentId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${studentId}/lifecycle-record`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          admissionDate: form.admissionDate || null,
          admissionClass: form.admissionClass || null,
          currentClass: form.currentClass || null,
          currentStatus: form.currentStatus,
          milestones: form.milestonesText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          graduationDate: form.graduationDate || null,
          certificationStatus: form.certificationStatus,
          suspensionCount: Number(form.suspensionCount || 0),
          withdrawalReason: form.withdrawalReason || null,
          overallPerformance: {
            note: form.performanceNote || null,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to save lifecycle record");
        return;
      }

      toast.success("Lifecycle record updated");
      await loadRecord();
    } catch (error) {
      console.error("Save lifecycle record error:", error);
      toast.error("Failed to save lifecycle record");
    } finally {
      setSaving(false);
    }
  };

  const handleExportTranscript = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/export/transcript?studentId=${encodeURIComponent(studentId)}&format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to export transcript");
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${student?.admissionNumber || studentId}-transcript.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export transcript error:", error);
      toast.error("Failed to export transcript");
    }
  };

  const handleGenerateRecommendation = async (level: "JSS3" | "SSS3") => {
    try {
      setRecommendationLoading(level);
      const token = localStorage.getItem("token");
      if (!token) return;

      const endpoint = level === "JSS3" ? "/api/ai/jss3-recommendation" : "/api/ai/sss3-recommendation";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to generate recommendation");
        return;
      }

      toast.success(`${level} recommendation generated`);
      await loadRecommendationHistory();
    } catch (error) {
      console.error("Generate recommendation error:", error);
      toast.error("Failed to generate recommendation");
    } finally {
      setRecommendationLoading(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="ADMIN">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Student Academic Record"
        description={student ? `${student.fullName} • ${student.admissionNumber}` : "Student record"}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/admin/students")}>Back</Button>
            <Button onClick={handleExportTranscript}>Export Transcript</Button>
          </div>
        }
      />

      <div className="space-y-6">
        {certificateStatus && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Certificate Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Eligibility</div>
                <div className={`mt-1 font-semibold ${certificateStatus.eligible ? "text-green-700" : "text-red-700"}`}>
                  {certificateStatus.eligible ? "Eligible" : "Not eligible"}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Has Certificate</div>
                <div className="mt-1 font-semibold text-gray-900">{certificateStatus.hasCertificate ? "Yes" : "No"}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Signed</div>
                <div className="mt-1 font-semibold text-gray-900">{certificateStatus.signed ? "Yes" : "No"}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Eligibility Code</div>
                <div className="mt-1 font-semibold text-gray-900">{certificateStatus.eligibilityCode}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">{certificateStatus.eligibilityReason}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Recommendation History</h2>
              <p className="text-sm text-gray-600 mt-1">Generate and review recommendation snapshots for this student.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={recommendationLoading !== null}
                onClick={() => handleGenerateRecommendation("JSS3")}
              >
                {recommendationLoading === "JSS3" ? "Generating..." : "Generate JSS3"}
              </Button>
              <Button
                disabled={recommendationLoading !== null}
                onClick={() => handleGenerateRecommendation("SSS3")}
              >
                {recommendationLoading === "SSS3" ? "Generating..." : "Generate SSS3"}
              </Button>
            </div>
          </div>

          {recommendationHistory.length === 0 ? (
            <div className="text-sm text-gray-500">No recommendation history yet. Generate one to start tracking.</div>
          ) : (
            <div className="space-y-3">
              {recommendationHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="font-medium text-gray-900">
                      {item.level} {item.topChoice ? `- Top choice: ${item.topChoice}` : "- No top choice yet"}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(item.requestedAt).toLocaleString()}</div>
                  </div>
                  {item.summary?.message ? (
                    <div className="text-sm text-gray-600">{item.summary.message}</div>
                  ) : (
                    <div className="space-y-1">
                      {item.recommendations.slice(0, 3).map((rec, index) => (
                        <div key={`${item.id}:${index}`} className="text-sm text-gray-700">
                          {(rec.path || rec.cluster || `Option ${index + 1}`)} - {Number(rec.confidence || 0).toFixed(2)}
                        </div>
                      ))}
                      <div className="text-xs text-gray-500">
                        Model: {item.summary?.model || "heuristic-v1"} | Scores used: {Number(item.summary?.scoreSampleSize || 0)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Lifecycle Record</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Admission Date" type="date" value={form.admissionDate} onChange={(e) => setForm((prev) => ({ ...prev, admissionDate: e.target.value }))} />
              <Input label="Graduation Date" type="date" value={form.graduationDate} onChange={(e) => setForm((prev) => ({ ...prev, graduationDate: e.target.value }))} />
              <Input label="Admission Class" value={form.admissionClass} onChange={(e) => setForm((prev) => ({ ...prev, admissionClass: e.target.value }))} />
              <Input label="Current Class" value={form.currentClass} onChange={(e) => setForm((prev) => ({ ...prev, currentClass: e.target.value }))} />
              <Select
                label="Current Status"
                value={form.currentStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, currentStatus: e.target.value }))}
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "GRADUATED", label: "Graduated" },
                  { value: "REPEATING", label: "Repeating" },
                  { value: "WITHDRAWN", label: "Withdrawn" },
                  { value: "SUSPENDED", label: "Suspended" },
                ]}
              />
              <Select
                label="Certification Status"
                value={form.certificationStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, certificationStatus: e.target.value }))}
                options={[
                  { value: "PENDING", label: "Pending" },
                  { value: "READY", label: "Ready" },
                  { value: "IN_PROGRESS", label: "In Progress" },
                  { value: "COMPLETED", label: "Completed" },
                ]}
              />
              <Input label="Suspension Count" type="number" value={form.suspensionCount} onChange={(e) => setForm((prev) => ({ ...prev, suspensionCount: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Reason</label>
              <textarea
                value={form.withdrawalReason}
                onChange={(e) => setForm((prev) => ({ ...prev, withdrawalReason: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Milestones</label>
              <textarea
                value={form.milestonesText}
                onChange={(e) => setForm((prev) => ({ ...prev, milestonesText: e.target.value }))}
                rows={5}
                placeholder="One milestone per line"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Performance Note</label>
              <textarea
                value={form.performanceNote}
                onChange={(e) => setForm((prev) => ({ ...prev, performanceNote: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Lifecycle Record"}</Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcript Summary</h2>
            {transcript.length === 0 ? (
              <div className="text-sm text-gray-500">No transcript data available yet.</div>
            ) : (
              <div className="space-y-4">
                {transcript.map((entry) => (
                  <div key={`${entry.sessionId}:${entry.termId}`} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{entry.yearLabel} - Term {entry.termNumber}</div>
                        <div className="text-sm text-gray-600">{entry.className || "Class not recorded"}</div>
                      </div>
                      <div className="text-right text-sm text-gray-700">
                        <div>Average: <span className="font-semibold">{Number(entry.averageScore || 0).toFixed(2)}</span></div>
                        <div>Total: <span className="font-semibold">{Number(entry.totalScore || 0).toFixed(2)}</span></div>
                        <div>Rank: <span className="font-semibold">{entry.classRanking ? `${entry.classRanking}/${entry.classSize || "-"}` : "-"}</span></div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-3">Subject</th>
                            <th className="py-2 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.subjects.map((subject, index) => {
                            const score = subject.total ?? subject.score ?? ((Number(subject.exam) || 0) + (Number(subject.test) || 0) + (Number(subject.classwork) || 0) + (Number(subject.homework) || 0) + (Number(subject.extracurricular) || 0));
                            return (
                              <tr key={`${subject.subjectId || subject.name || subject.subjectName || index}`} className="border-b last:border-b-0">
                                <td className="py-2 pr-3 text-gray-900">{subject.subjectName || subject.name || "Unknown Subject"}</td>
                                <td className="py-2 text-right text-gray-700">{Number(score || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}