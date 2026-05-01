"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, LoadingSpinner, PageHeader } from "@/app/components/UIComponents";

type LifecycleRecord = {
  admissionDate: string | null;
  admissionClass: string | null;
  currentClass: string | null;
  currentStatus: string;
  milestones: string[];
  graduationDate: string | null;
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

export default function ParentWardRecordPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleRecord | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [recommendationHistory, setRecommendationHistory] = useState<RecommendationHistoryItem[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState<"JSS3" | "SSS3" | null>(null);

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

      setStudent(transcriptData?.student || lifecycleData?.student || certificateData?.student || null);
      setLifecycle(lifecycleData?.lifecycle || null);
      setTranscript(transcriptData?.transcript || []);
      setCertificateStatus(certificateData?.status || null);
    } catch (error) {
      console.error("Load ward academic record error:", error);
      toast.error("Failed to load ward academic record");
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
      console.error("Load ward recommendation history error:", error);
    }
  }, [studentId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}") as { role?: string };

    if (!token || user.role !== "PARENT") {
      router.push("/login");
      return;
    }

    if (!studentId) {
      router.push("/parent/wards");
      return;
    }

    loadRecord();
    loadRecommendationHistory();
  }, [loadRecord, loadRecommendationHistory, router, studentId]);

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
      console.error("Generate ward recommendation error:", error);
      toast.error("Failed to generate recommendation");
    } finally {
      setRecommendationLoading(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="PARENT">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="PARENT">
      <PageHeader
        title="Ward Academic Record"
        description={student ? `${student.fullName} • ${student.admissionNumber}` : "Ward record"}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/parent/wards")}>Back</Button>
            <Button onClick={handleExportTranscript}>Export Transcript</Button>
          </div>
        }
      />

      <div className="space-y-6">
        {certificateStatus && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Certificate Readiness</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Eligibility</div>
                <div className={`mt-1 font-semibold ${certificateStatus.eligible ? "text-green-700" : "text-red-700"}`}>
                  {certificateStatus.eligible ? "Eligible" : "Not eligible"}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Certificate Created</div>
                <div className="mt-1 font-semibold text-gray-900">{certificateStatus.hasCertificate ? "Yes" : "No"}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Signed</div>
                <div className="mt-1 font-semibold text-gray-900">{certificateStatus.signed ? "Yes" : "No"}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">{certificateStatus.eligibilityReason}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Recommendation History</h2>
              <p className="text-sm text-gray-600 mt-1">View and regenerate recommendation snapshots for your ward.</p>
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
            <div className="text-sm text-gray-500">No recommendation history yet for this ward.</div>
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lifecycle Summary</h2>
            {!lifecycle ? (
              <div className="text-sm text-gray-500">No lifecycle record has been created yet.</div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-gray-600">Current Status</div>
                    <div className="mt-1 font-semibold text-gray-900">{lifecycle.currentStatus || "N/A"}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-gray-600">Certification Status</div>
                    <div className="mt-1 font-semibold text-gray-900">{lifecycle.certificationStatus || "N/A"}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-gray-600">Admission Date</div>
                    <div className="mt-1 font-semibold text-gray-900">{lifecycle.admissionDate ? new Date(lifecycle.admissionDate).toLocaleDateString() : "N/A"}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-gray-600">Graduation Date</div>
                    <div className="mt-1 font-semibold text-gray-900">{lifecycle.graduationDate ? new Date(lifecycle.graduationDate).toLocaleDateString() : "N/A"}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Milestones</h3>
                  {lifecycle.milestones?.length ? (
                    <ul className="space-y-2 text-gray-700">
                      {lifecycle.milestones.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No milestones recorded yet.</div>
                  )}
                </div>

                {lifecycle.overallPerformance?.note && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Performance Note</h3>
                    <div className="rounded-lg bg-blue-50 px-4 py-3 text-gray-700">{lifecycle.overallPerformance.note}</div>
                  </div>
                )}
              </div>
            )}
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