"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, LoadingSpinner, Select } from "@/app/components/UIComponents";

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
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex gap-5 flex-wrap items-end">
          <div className="flex-1 min-w-45">
            <Select
              label="Class"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              options={[{ value: "", label: "Select class…" }, ...classes.map((c) => ({ value: c._id, label: `${c.level} ${c.arm}` }))]}
            />
          </div>
          <div className="flex-1 min-w-45">
            <Select
              label="Term"
              value={selectedTerm}
              onChange={(e) => handleTermChange(e.target.value)}
              options={[
                { value: "", label: "Select term…" },
                ...terms.map((t) => ({
                  value: t._id,
                  label: `${t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term${t.isActive ? " (Active)" : ""}`,
                })),
              ]}
            />
          </div>
        </div>

        {/* Timetable Grid */}
        {selectedClass && selectedTerm ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {selectedClassName ? `${selectedClassName.level} ${selectedClassName.arm}` : ""} — Weekly Schedule
              </h2>
              <p className="text-xs text-gray-400">Times set per row apply to all days</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Time</th>
                    {DAYS.map((d) => (
                      <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wide">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: PERIODS_COUNT }, (_, pi) => (
                    <tr key={pi} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                          {pi + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={schedule[0]?.periods[pi]?.startTime ?? ""}
                            onChange={(e) => DAYS.forEach((_, di) => updatePeriod(di, pi, "startTime", e.target.value))}
                            className="w-22 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                          />
                          <span className="text-gray-300 font-light">—</span>
                          <input
                            type="time"
                            value={schedule[0]?.periods[pi]?.endTime ?? ""}
                            onChange={(e) => DAYS.forEach((_, di) => updatePeriod(di, pi, "endTime", e.target.value))}
                            className="w-22 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                          />
                        </div>
                      </td>
                      {schedule.map((day, di) => {
                        const p = day.periods[pi];
                        return (
                          <td key={day.day} className="px-2 py-2 min-w-35">
                            <input
                              placeholder="Subject"
                              value={p?.subjectName ?? ""}
                              onChange={(e) => updatePeriod(di, pi, "subjectName", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs mb-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white placeholder-gray-300"
                            />
                            <input
                              placeholder="Teacher"
                              value={p?.teacherName ?? ""}
                              onChange={(e) => updatePeriod(di, pi, "teacherName", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white placeholder-gray-300"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm py-16 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-500 font-medium">Select a class and term to view or edit the timetable</p>
            <p className="text-gray-400 text-sm mt-1">Changes are saved per class per term</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
