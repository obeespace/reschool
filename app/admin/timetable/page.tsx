"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, LoadingSpinner } from "@/app/components/UIComponents";

type ClassItem = { _id: string; level: string; arm: string };
type TermItem = { _id: string; termNumber: number; isActive: boolean };
type Period = { periodNumber: number; startTime: string; endTime: string; subjectName?: string; teacherName?: string; label?: string };
type DaySchedule = { day: string; periods: Period[] };

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const PERIODS_COUNT = 8;

function emptySchedule(): DaySchedule[] {
  return DAYS.map((day) => ({
    day,
    periods: Array.from({ length: PERIODS_COUNT }, (_, i) => ({
      periodNumber: i + 1,
      startTime: "",
      endTime: "",
      subjectName: "",
      teacherName: "",
      label: "",
    })),
  }));
}

export default function AdminTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [schedule, setSchedule] = useState<DaySchedule[]>(emptySchedule());

  const loadInitial = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/classes", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/terms", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setClasses(d.classes || []); }
      if (tRes.ok) {
        const d = await tRes.json();
        const termList: TermItem[] = d.terms || [];
        setTerms(termList);
        const active = termList.find((t) => t.isActive);
        if (active) setSelectedTerm(active._id);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const loadTimetable = useCallback(async (classId: string, termId: string) => {
    if (!classId || !termId) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/timetable?classId=${classId}&termId=${termId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const d = await res.json();
      if (d.timetable?.schedule?.length) {
        setSchedule(d.timetable.schedule);
      } else {
        setSchedule(emptySchedule());
      }
    }
  }, []);

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    loadTimetable(classId, selectedTerm);
  };

  const handleTermChange = (termId: string) => {
    setSelectedTerm(termId);
    loadTimetable(selectedClass, termId);
  };

  const updatePeriod = (dayIdx: number, periodIdx: number, field: keyof Period, value: string | number) => {
    setSchedule((prev) => {
      const next = prev.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          periods: d.periods.map((p, pi) =>
            pi !== periodIdx ? p : { ...p, [field]: value }
          ),
        }
      );
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedTerm) {
      toast.error("Select a class and term first");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId: selectedClass, termId: selectedTerm, schedule }),
      });
      if (res.ok) {
        toast.success("Timetable saved!");
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to save timetable");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout role="ADMIN"><LoadingSpinner /></DashboardLayout>;

  const selectedClassName = classes.find((c) => c._id === selectedClass);

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Timetable"
        description="Create and manage class timetables"
        action={
          <Button onClick={handleSave} disabled={saving || !selectedClass || !selectedTerm}>
            {saving ? "Saving…" : "Save Timetable"}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.level} {c.arm}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => handleTermChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select Term —</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term
                  {t.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timetable Grid */}
        {selectedClass && selectedTerm ? (
          <div className="overflow-x-auto">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {selectedClassName ? `${selectedClassName.level} ${selectedClassName.arm}` : ""} — Weekly Schedule
            </h2>
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-xs">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-3 py-2 border border-gray-200 text-left font-semibold text-gray-600 w-10">Period</th>
                  <th className="px-3 py-2 border border-gray-200 text-left font-semibold text-gray-600 w-24">Time</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-3 py-2 border border-gray-200 text-center font-semibold text-indigo-700">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PERIODS_COUNT }, (_, pi) => (
                  <tr key={pi} className="even:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 text-center font-semibold text-gray-500">{pi + 1}</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="flex gap-1 items-center">
                        <input
                          type="time"
                          value={schedule[0]?.periods[pi]?.startTime ?? ""}
                          onChange={(e) => DAYS.forEach((_, di) => updatePeriod(di, pi, "startTime", e.target.value))}
                          className="w-20 border border-gray-200 rounded px-1 py-0.5 text-xs"
                        />
                        <span className="text-gray-400">–</span>
                        <input
                          type="time"
                          value={schedule[0]?.periods[pi]?.endTime ?? ""}
                          onChange={(e) => DAYS.forEach((_, di) => updatePeriod(di, pi, "endTime", e.target.value))}
                          className="w-20 border border-gray-200 rounded px-1 py-0.5 text-xs"
                        />
                      </div>
                    </td>
                    {schedule.map((day, di) => {
                      const p = day.periods[pi];
                      return (
                        <td key={day.day} className="px-2 py-1.5 border border-gray-200 min-w-[130px]">
                          <input
                            placeholder="Subject"
                            value={p?.subjectName ?? ""}
                            onChange={(e) => updatePeriod(di, pi, "subjectName", e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs mb-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <input
                            placeholder="Teacher"
                            value={p?.teacherName ?? ""}
                            onChange={(e) => updatePeriod(di, pi, "teacherName", e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">Tip: Set time in the first column — it applies to all days for that period.</p>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
            Select a class and term above to view or edit its timetable.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
