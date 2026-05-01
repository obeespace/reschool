"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, LoadingSpinner, Modal, Input } from "@/app/components/UIComponents";

type HouseEntry = { _id: string; houseName: string; category: string; points: number; description: string; createdAt: string };
type Leaderboard = { house: string; points: number };
type TermItem = { _id: string; termNumber: number; isActive: boolean };
type StudentItem = { _id: string; fullName: string; admissionNumber: string; house?: string };

const CATEGORIES = ["SPORTS", "ACADEMIC", "CULTURAL", "GENERAL"];

export default function AdminHousesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [entries, setEntries] = useState<HouseEntry[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [awardForm, setAwardForm] = useState({ houseName: "", category: "GENERAL", points: "", description: "", studentId: "" });
  const [assignForm, setAssignForm] = useState({ studentId: "", house: "" });
  const [saving, setSaving] = useState(false);

  const loadHouseData = useCallback(async (termId: string) => {
    const token = localStorage.getItem("token");
    const url = termId ? `/api/houses?termId=${termId}` : "/api/houses";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const d = await res.json();
      setLeaderboard(d.leaderboard || []);
      setEntries(d.entries || []);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    Promise.all([
      fetch("/api/terms", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/students", { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([tRes, sRes]) => {
      if (tRes.ok) {
        const d = await tRes.json();
        const termList: TermItem[] = d.terms || [];
        setTerms(termList);
        const active = termList.find((t) => t.isActive);
        const id = active?._id ?? termList[0]?._id ?? "";
        setSelectedTerm(id);
        if (id) loadHouseData(id);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setStudents(d.students || []);
      }
    }).finally(() => setLoading(false));
  }, [router, loadHouseData]);

  const handleTermChange = (termId: string) => {
    setSelectedTerm(termId);
    loadHouseData(termId);
  };

  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerm) { toast.error("Select a term first"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...awardForm, points: Number(awardForm.points), termId: selectedTerm }),
      });
      if (res.ok) {
        toast.success("Points awarded!");
        setShowAwardModal(false);
        setAwardForm({ houseName: "", category: "GENERAL", points: "", description: "", studentId: "" });
        loadHouseData(selectedTerm);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to award points");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAssignHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/houses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(assignForm),
      });
      if (res.ok) {
        toast.success("House assigned!");
        setShowAssignModal(false);
        setAssignForm({ studentId: "", house: "" });
        // Refresh students list
        const sRes = await fetch("/api/students", { headers: { Authorization: `Bearer ${token}` } });
        if (sRes.ok) { const d = await sRes.json(); setStudents(d.students || []); }
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to assign house");
      }
    } finally {
      setSaving(false);
    }
  };

  const medalColor = (i: number) => i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300";
  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

  if (loading) return <DashboardLayout role="ADMIN"><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="House System"
        description="Manage inter-house competition, award points, and assign students to houses"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowAssignModal(true)}>Assign House</Button>
            <Button onClick={() => setShowAwardModal(true)}>+ Award Points</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Term Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => handleTermChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {terms.map((t) => (
              <option key={t._id} value={t._id}>
                {t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term
                {t.isActive ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">House Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="text-gray-400 text-sm">No points awarded yet this term.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {leaderboard.map((h, i) => (
                <div key={h.house} className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${medalColor(i)}`}>{medal(i)}</div>
                  <div className="font-semibold text-gray-800 mt-1">{h.house}</div>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">{h.points}</div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Point Awards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Awards</h2>
          {entries.length === 0 ? (
            <p className="text-gray-400 text-sm">No awards yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">House</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.slice(0, 50).map((e) => (
                    <tr key={e._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{e.houseName}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">{e.category}</span>
                      </td>
                      <td className="px-4 py-2 font-bold text-indigo-600">+{e.points}</td>
                      <td className="px-4 py-2 text-gray-600">{e.description}</td>
                      <td className="px-4 py-2 text-gray-500">{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Students House Assignments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Student House Assignments</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adm. No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">House</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{s.fullName}</td>
                    <td className="px-4 py-2 text-gray-500">{s.admissionNumber}</td>
                    <td className="px-4 py-2">
                      {s.house ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{s.house}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Award Points Modal */}
      <Modal isOpen={showAwardModal} onClose={() => setShowAwardModal(false)} title="Award House Points">
        <form onSubmit={handleAwardPoints} className="space-y-4">
          <Input
            label="House Name"
            value={awardForm.houseName}
            onChange={(e) => setAwardForm({ ...awardForm, houseName: e.target.value })}
            placeholder="e.g. Red, Awolowo, Gold"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={awardForm.category}
              onChange={(e) => setAwardForm({ ...awardForm, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input
            label="Points"
            type="number"
            value={awardForm.points}
            onChange={(e) => setAwardForm({ ...awardForm, points: e.target.value })}
            placeholder="e.g. 10"
            required
          />
          <Input
            label="Description"
            value={awardForm.description}
            onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
            placeholder="e.g. Won inter-house athletics 100m sprint"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student (optional)</label>
            <select
              value={awardForm.studentId}
              onChange={(e) => setAwardForm({ ...awardForm, studentId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— None (team/house award) —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.fullName} ({s.admissionNumber})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Award Points"}</Button>
            <Button variant="secondary" onClick={() => setShowAwardModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Assign House Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Student to House">
        <form onSubmit={handleAssignHouse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              value={assignForm.studentId}
              onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.fullName} ({s.admissionNumber})</option>
              ))}
            </select>
          </div>
          <Input
            label="House Name"
            value={assignForm.house}
            onChange={(e) => setAssignForm({ ...assignForm, house: e.target.value })}
            placeholder="e.g. Red, Awolowo, Gold"
            required
          />
          <div className="flex gap-3">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Assign House"}</Button>
            <Button variant="secondary" onClick={() => setShowAssignModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
