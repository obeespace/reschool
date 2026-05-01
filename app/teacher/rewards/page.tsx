"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button } from "@/app/components/UIComponents";

interface BreakdownEntry {
  label: string;
  key: string;
  cap: number;
}

interface TeacherRewardEntry {
  teacherId: string;
  teacherName: string;
  rank: number;
  points: number;
  activeDays: number;
  marksRecorded: number;
  attendanceMarked: number;
  remarksRecorded: number;
  announcementsPosted: number;
  breakdown: {
    marksPoints: number;
    attendancePoints: number;
    remarksPoints: number;
    announcementsPoints: number;
    appActivityPoints: number;
    frequencyPoints: number;
    timelinessPoints: number;
    consistencyPoints: number;
    qualityPoints: number;
  };
}

const BREAKDOWN_LABELS: BreakdownEntry[] = [
  { label: "Daily Marks", key: "marksPoints", cap: 120 },
  { label: "Attendance Updates", key: "attendancePoints", cap: 40 },
  { label: "Remarks Written", key: "remarksPoints", cap: 40 },
  { label: "Announcements", key: "announcementsPoints", cap: 20 },
  { label: "App Activity", key: "appActivityPoints", cap: 20 },
  { label: "Active Days (Frequency)", key: "frequencyPoints", cap: 25 },
  { label: "Timeliness", key: "timelinessPoints", cap: 12 },
  { label: "Consistency", key: "consistencyPoints", cap: 12 },
  { label: "Score Quality", key: "qualityPoints", cap: 20 },
];

const MAX_TOTAL = BREAKDOWN_LABELS.reduce((sum, b) => sum + b.cap, 0);

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function TeacherRewardsPage() {
  const router = useRouter();
  const [self, setSelf] = useState<TeacherRewardEntry | null>(null);
  const [leaderboard, setLeaderboard] = useState<TeacherRewardEntry[]>([]);
  const [termId, setTermId] = useState<string | null>(null);
  const [totalRanked, setTotalRanked] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      setLoading(true);
      const res = await fetch("/api/teachers/leaderboard?limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to load rewards data");
        return;
      }
      const data = await res.json();
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setSelf(data.self ?? null);
      setTermId(data.termId ?? null);
      setTotalRanked(data.totalTeachersRanked ?? 0);
    } catch {
      toast.error("Error loading rewards");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const renderProgressBar = (value: number, cap: number) => {
    const pct = Math.min(100, Math.round((value / cap) * 100));
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-gray-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 w-16 text-right">
          {value} / {cap}
        </span>
      </div>
    );
  };

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="My Rewards & Rank"
        description="Your performance score for the current term — top 5 teachers receive a gift"
        action={
          <Button variant="secondary" onClick={fetchRewards}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="text-gray-500 py-12 text-center">Loading your rank…</div>
      ) : (
        <>
          {/* My rank card */}
          {self ? (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Standing</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Your Rank", value: `#${self.rank} of ${totalRanked}`, color: self.rank <= 5 ? "text-green-600" : "text-blue-600" },
                  { label: "Total Points", value: `${self.points} / ${MAX_TOTAL}`, color: "text-blue-700" },
                  { label: "Active Days", value: self.activeDays, color: "text-gray-900" },
                  { label: "Marks Recorded", value: self.marksRecorded, color: "text-gray-900" },
                ].map((item) => (
                  <div key={item.label} className="bg-white border rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium mb-1">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    {item.label === "Your Rank" && (
                      <p className="text-xs text-gray-500 mt-1">{self.rank <= 5 ? "🎁 In gift zone!" : "Need top 5 to win"}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Points breakdown */}
              <div className="bg-white rounded-lg border p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Points Breakdown</h3>
                <div className="space-y-3">
                  {BREAKDOWN_LABELS.map((b) => {
                    const val = (self.breakdown as Record<string, number>)[b.key] ?? 0;
                    return (
                      <div key={b.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{b.label}</span>
                        </div>
                        {renderProgressBar(val, b.cap)}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total Score</span>
                  <span className="text-xl font-bold text-blue-600">
                    {self.points} <span className="text-sm text-gray-500">/ {MAX_TOTAL}</span>
                  </span>
                </div>
              </div>

              {/* Incentive message */}
              {self.rank <= 5 ? (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
                  🎁 Congratulations! You are currently in the top 5 for this term. Keep it up to secure your gift!
                </div>
              ) : (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                  <p className="font-medium mb-1">How to climb the leaderboard:</p>
                  <ul className="text-sm space-y-1 list-disc pl-4">
                    <li>Enter daily marks regularly and on time</li>
                    <li>Mark attendance for your classes every day</li>
                    <li>Write detailed remarks for students</li>
                    <li>Post announcements to keep parents informed</li>
                    <li>Log in frequently — consistency matters</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              No activity recorded yet this term. Start logging marks, attendance, and remarks to earn points!
            </div>
          )}

          {/* Top 5 leaderboard */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Top 5 Leaderboard — Term {termId ?? "Current"}
            </h2>
            {leaderboard.length === 0 ? (
              <div className="text-gray-500 py-8 text-center bg-white rounded-lg border">
                No ranking data yet for this term.
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Rank</th>
                      <th className="text-left px-4 py-3 font-semibold">Teacher</th>
                      <th className="text-right px-4 py-3 font-semibold">Points</th>
                      <th className="text-right px-4 py-3 font-semibold">Active Days</th>
                      <th className="text-right px-4 py-3 font-semibold">Marks</th>
                      <th className="text-right px-4 py-3 font-semibold">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => {
                      const isMe = self?.teacherId === entry.teacherId;
                      return (
                        <tr
                          key={entry.teacherId}
                          className={`border-b ${isMe ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-4 py-3 text-lg">
                            {MEDAL[entry.rank] ?? `#${entry.rank}`}
                            {isMe && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-800">{entry.teacherName}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">{entry.points}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{entry.activeDays}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{entry.marksRecorded}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{entry.attendanceMarked}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
