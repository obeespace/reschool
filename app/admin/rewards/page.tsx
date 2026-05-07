"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, PageHeader } from "@/app/components/UIComponents";

type RewardBreakdown = {
  marksPoints?: number;
  attendancePoints?: number;
  remarksPoints?: number;
  announcementsPoints?: number;
  appActivityPoints?: number;
  frequencyPoints?: number;
  timelinessPoints?: number;
  consistencyPoints?: number;
  qualityPoints?: number;
};

type RewardEntry = {
  teacherId: string;
  teacherName: string;
  rank: number;
  points: number;
  activeDays?: number;
  marksRecorded?: number;
  attendanceMarked?: number;
  remarksRecorded?: number;
  announcementsPosted?: number;
  appEvents?: number;
  averageScore?: number;
  breakdown?: RewardBreakdown;
};

type WinnerRow = {
  id: string;
  teacherId: string;
  rank: number;
  points: number;
  breakdownJson: string;
  createdAt: string;
};

export default function AdminRewardsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState<string | null>(null);
  const [termName, setTermName] = useState<string>("");
  const [liveTop, setLiveTop] = useState<RewardEntry[]>([]);
  const [finalized, setFinalized] = useState(false);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/teachers/leaderboard?limit=5", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to load leaderboard");
    }

    setLiveTop(Array.isArray(data.leaderboard) ? data.leaderboard : []);
    setTermId(data.termId || null);
    if (data.termName) setTermName(data.termName);
  }, []);

  const fetchFinalized = useCallback(async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/teachers/rewards", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to load finalized winners");
    }

    setFinalized(Boolean(data.finalized));
    setWinners(Array.isArray(data.winners) ? data.winners : []);
    if (!termId && data.termId) {
      setTermId(data.termId);
    }
  }, [termId]);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([fetchLeaderboard(), fetchFinalized()]);
    } catch (error: unknown) {
      console.error("Load rewards dashboard error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, [fetchLeaderboard, fetchFinalized]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}") as { role?: string };

    if (!token || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    loadAll();
  }, [router, loadAll]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadAll();
      toast.success("Rewards data refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleFinalizeTop5 = async (forceRecompute = false) => {
    try {
      setFinalizing(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/teachers/rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(termId ? { termId } : {}),
          forceRecompute,
          note: "Term top-5 reward winners finalized from Admin dashboard",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to finalize winners");
        return;
      }

      toast.success(`Top ${data.giftedCount || 5} winners finalized`);
      await loadAll();
    } catch (error: unknown) {
      console.error("Finalize winners error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to finalize winners");
    } finally {
      setFinalizing(false);
    }
  };

  const exportRows = useMemo(() => {
    if (finalized && winners.length > 0) {
      return winners
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((row) => ({
          rank: row.rank,
          teacherId: row.teacherId,
          points: row.points,
          finalizedAt: row.createdAt,
        }));
    }

    return liveTop.map((row) => ({
      rank: row.rank,
      teacherId: row.teacherId,
      points: row.points,
      finalizedAt: "",
    }));
  }, [finalized, winners, liveTop]);

  const handleExportCsv = () => {
    if (exportRows.length === 0) {
      toast.error("No rows to export");
      return;
    }

    const header = ["rank", "teacherId", "points", "finalizedAt"];
    const csv = [
      header.join(","),
      ...exportRows.map((row) =>
        [row.rank, row.teacherId, row.points, row.finalizedAt]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher_rewards_top5_${termId || "term"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout role="ADMIN">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading rewards...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Teacher Rewards"
        description="Term-based top 5 winners across the entire app"
        action={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
            <Button onClick={() => handleFinalizeTop5(false)} disabled={finalizing}>
              {finalizing ? "Finalizing..." : "Finalize Top 5"}
            </Button>
            <Button variant="danger" onClick={() => handleFinalizeTop5(true)} disabled={finalizing}>
              {finalizing ? "Recomputing..." : "Force Recompute"}
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 pb-6 pt-4 sm:pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600">Term</p>
            <p className="text-xl font-semibold text-gray-900">{termName || "N/A"}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600">Live Ranked</p>
            <p className="text-xl font-semibold text-gray-900">{liveTop.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600">Finalized</p>
            <p className="text-xl font-semibold text-gray-900">{finalized ? "Yes" : "No"}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600">Gift Slots</p>
            <p className="text-xl font-semibold text-gray-900">5</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Live Top 5</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teacher</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Active Days</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Marks</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {liveTop.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No teacher activity in this term yet.</td>
                  </tr>
                ) : (
                  liveTop.map((row) => (
                    <tr key={row.teacherId} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{row.rank}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.teacherName}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-700">{row.points.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.activeDays || 0}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.marksRecorded || 0}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.attendanceMarked || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Finalized Winners (Gift List)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teacher ID</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Finalized At</th>
                </tr>
              </thead>
              <tbody>
                {winners.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>No finalized winners for this term yet.</td>
                  </tr>
                ) : (
                  winners
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((row) => (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{row.rank}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.teacherId}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">{Number(row.points).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
