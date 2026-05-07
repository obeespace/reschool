"use client";

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trophy, Star, Users } from "lucide-react";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, StatCard, DataTable, Button, LoadingSpinner, Modal, Input, Select } from "@/app/components/UIComponents";

type HouseEntry = { _id: string; houseName: string; category: string; points: number; description: string; createdAt: string };
type Leaderboard = { house: string; points: number };
type TermItem = { _id: string; termNumber: number; isActive: boolean };
type StudentItem = { _id: string; fullName: string; admissionNumber: string; house?: string };

const CATEGORIES = [
  { value: "SPORTS", label: "Sports" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "GENERAL", label: "General" },
];

const RANK_STYLES = [
  { medal: "🥇", bg: "bg-gradient-to-br from-amber-50 to-yellow-50", border: "border-amber-200", text: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  { medal: "🥈", bg: "bg-gradient-to-br from-gray-50 to-slate-50", border: "border-gray-200", text: "text-gray-500", badge: "bg-gray-100 text-gray-600" },
  { medal: "🥉", bg: "bg-gradient-to-br from-orange-50 to-amber-50", border: "border-orange-200", text: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  { medal: "", bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-400", badge: "bg-gray-100 text-gray-500" },
];

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

  const getRankStyle = (i: number) => RANK_STYLES[Math.min(i, 3)];

  const termOptions = terms.map((t) => ({
    value: t._id,
    label: `${t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term${t.isActive ? " (Active)" : ""}`,
  }));
  const studentOptions = [
    { value: "", label: "None (team / house award)" },
    ...students.map((s) => ({ value: s._id, label: `${s.fullName} (${s.admissionNumber})` })),
  ];
  const studentSelectOptions = [
    { value: "", label: "Select student…" },
    ...students.map((s) => ({ value: s._id, label: `${s.fullName} (${s.admissionNumber})` })),
  ];
  const totalPoints = leaderboard.reduce((s, h) => s + h.points, 0);

  const entriesRows = entries.slice(0, 50).map((e) => ({
    house: e.houseName,
    category: e.category,
    points: e.points,
    description: e.description,
    date: new Date(e.createdAt).toLocaleDateString("en-GB"),
  }));
  const entriesColumns = [
    { header: "House", accessor: "house", render: (v: string) => <span className="font-semibold text-gray-900">{v}</span> },
    {
      header: "Category", accessor: "category",
      render: (v: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{v}</span>
      ),
    },
    {
      header: "Points", accessor: "points",
      render: (v: number) => <span className="font-bold text-indigo-600">+{v}</span>,
    },
    { header: "Description", accessor: "description" },
    { header: "Date", accessor: "date", render: (v: string) => <span className="text-gray-500">{v}</span> },
  ];

  const studentsRows = students.map((s) => ({
    name: s.fullName,
    admNo: s.admissionNumber,
    house: s.house,
  }));
  const studentsColumns = [
    { header: "Student", accessor: "name", render: (v: string) => <span className="font-medium">{v}</span> },
    { header: "Adm. No", accessor: "admNo", render: (v: string) => <span className="text-gray-500">{v}</span> },
    {
      header: "House", accessor: "house",
      render: (v: string) => v
        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{v}</span>
        : <span className="text-xs text-gray-400 italic">Unassigned</span>,
    },
  ];

  if (loading) return <DashboardLayout role="ADMIN"><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="House System"
        description="Manage inter-house competition, award points, and assign students to houses"
        action={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="secondary" onClick={() => setShowAssignModal(true)}>Assign House</Button>
            <Button onClick={() => setShowAwardModal(true)}>+ Award Points</Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Term Filter */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="max-w-xs">
            <Select label="Term" value={selectedTerm} onChange={(e) => handleTermChange(e.target.value)} options={termOptions} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Houses Competing" value={leaderboard.length} icon={Trophy} color="yellow" />
          <StatCard title="Total Points Awarded" value={totalPoints} icon={Star} color="indigo" />
          <StatCard title="Students Assigned" value={students.filter((s) => s.house).length} icon={Users} color="green" />
        </div>

        {/* Leaderboard */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">House Leaderboard</h2>
          </div>
          {leaderboard.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Trophy className="mx-auto mb-3 text-gray-300" size={36} />
              <p className="text-gray-500 text-sm">No points awarded yet this term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6">
              {leaderboard.map((h, i) => {
                const style = getRankStyle(i);
                return (
                  <div key={h.house} className={`${style.bg} border ${style.border} rounded-xl p-5 text-center transition-shadow hover:shadow-md`}>
                    {style.medal && <div className="text-3xl mb-1">{style.medal}</div>}
                    {!style.medal && <div className={`text-lg font-bold ${style.text} mb-1`}>{i + 1}</div>}
                    <div className="font-semibold text-gray-800 text-sm mt-1 truncate">{h.house}</div>
                    <div className={`text-3xl font-bold ${style.text} mt-2`}>{h.points}</div>
                    <div className={`text-xs mt-1 font-medium ${style.text}`}>points</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Awards */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Awards</h2>
          </div>
          {entries.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Star className="mx-auto mb-3 text-gray-300" size={36} />
              <p className="text-gray-500 text-sm">No awards yet. Click <strong>+ Award Points</strong> to get started.</p>
            </div>
          ) : (
            <DataTable columns={entriesColumns} data={entriesRows} />
          )}
        </div>

        {/* Student House Assignments */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Student House Assignments</h2>
            <span className="text-xs text-gray-400">{students.filter((s) => s.house).length} / {students.length} assigned</span>
          </div>
          <DataTable columns={studentsColumns} data={studentsRows} />
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
          <Select label="Category" value={awardForm.category}
            onChange={(e) => setAwardForm({ ...awardForm, category: e.target.value })}
            options={CATEGORIES}
          />
          <Input
            label="Points"
            type="number"
            value={awardForm.points}
            onChange={(e) => setAwardForm({ ...awardForm, points: e.target.value })}
            placeholder="e.g. 10"
            required
          />
          <Input label="Description" value={awardForm.description}
            onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
            placeholder="e.g. Won inter-house athletics 100m sprint"
            required
          />
          <Select label="Student (optional — for individual contribution)" value={awardForm.studentId}
            onChange={(e) => setAwardForm({ ...awardForm, studentId: e.target.value })}
            options={studentOptions}
          />
          <div className="flex gap-3 pt-1">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Award Points"}</Button>
            <Button variant="secondary" onClick={() => setShowAwardModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Assign House Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Student to House">
        <form onSubmit={handleAssignHouse} className="space-y-4">
          <Select label="Student" value={assignForm.studentId}
            onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
            options={studentSelectOptions}
            required
          />
          <Input label="House Name" value={assignForm.house}
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
