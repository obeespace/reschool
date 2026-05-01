"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Select } from "@/app/components/UIComponents";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface ClassInfo {
  id: string;
  level: string;
  arm: string;
}

interface AttendanceRow {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  excuseReason: string;
}

interface ExistingAttendance {
  studentId: string;
  status: string;
  excuseReason?: string | null;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "PRESENT", label: "Present", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "ABSENT", label: "Absent", color: "bg-red-100 text-red-700 border-red-300" },
  { value: "LATE", label: "Late", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "EXCUSED", label: "Excused", color: "bg-blue-100 text-blue-700 border-blue-300" },
];

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const fetchTeacherClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      setLoadingClasses(true);
      const res = await fetch("/api/teachers/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();

      // Gather unique classes from subjectsAndClasses assignments
      const classMap = new Map<string, ClassInfo>();
      const profile = data.profile ?? data;
      if (Array.isArray(profile?.subjectsAndClasses)) {
        for (const assignment of profile.subjectsAndClasses) {
          for (const cls of (assignment.classIds ?? [])) {
            if (cls?._id) classMap.set(cls._id, { id: cls._id, level: cls.level, arm: cls.arm });
          }
        }
      }
      // Also include class teacher assignment
      if (profile?.classTeacher?._id) {
        const ct = profile.classTeacher;
        classMap.set(ct._id, { id: ct._id, level: ct.level, arm: ct.arm });
      }
      setClasses([...classMap.values()]);
    } catch {
      toast.error("Could not load your classes");
    } finally {
      setLoadingClasses(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTeacherClasses();
  }, [fetchTeacherClasses]);

  const loadAttendanceSheet = useCallback(async (classId: string, date: string) => {
    if (!classId) return;
    try {
      setLoadingSheet(true);
      setRows([]);
      const token = localStorage.getItem("token");

      // Load students in class
      const studentsRes = await fetch(`/api/teachers/students?classId=${encodeURIComponent(classId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!studentsRes.ok) {
        toast.error("Failed to load students");
        return;
      }
      const studentsData = await studentsRes.json();
      const studentList: { id: string; fullName?: string; firstName?: string; lastName?: string }[] = Array.isArray(studentsData.students)
        ? studentsData.students
        : [];

      // Load existing attendance for this class+date
      const attendanceRes = await fetch(
        `/api/attendance/mark?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const existingMap = new Map<string, ExistingAttendance>();
      if (attendanceRes.ok) {
        const attData = await attendanceRes.json();
        const existing: ExistingAttendance[] = Array.isArray(attData.attendance) ? attData.attendance : [];
        for (const rec of existing) existingMap.set(rec.studentId, rec);
        setHasExisting(existing.length > 0);
      } else {
        setHasExisting(false);
      }

      const sheetRows: AttendanceRow[] = studentList.map((s) => {
        const existing = existingMap.get(s.id);
        const name = s.fullName ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
        return {
          studentId: s.id,
          studentName: name,
          status: (existing?.status?.toUpperCase() as AttendanceStatus) ?? "PRESENT",
          excuseReason: existing?.excuseReason ?? "",
        };
      });
      setRows(sheetRows);
    } catch {
      toast.error("Error loading attendance sheet");
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadAttendanceSheet(selectedClass, selectedDate);
    }
  }, [selectedClass, selectedDate, loadAttendanceSheet]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const setExcuseReason = (studentId: string, reason: string) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, excuseReason: reason } : r))
    );
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: "PRESENT" as AttendanceStatus })));
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedDate || rows.length === 0) {
      toast.error("Select a class and date first");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClass,
          attendanceDate: selectedDate,
          records: rows.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            excuseReason: r.status === "EXCUSED" ? r.excuseReason : undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save attendance");
        return;
      }
      toast.success("Attendance saved successfully");
      setHasExisting(true);
    } catch {
      toast.error("Error saving attendance");
    } finally {
      setSaving(false);
    }
  };

  const classOptions = [
    { value: "", label: "Select a class" },
    ...classes.map((c) => ({ value: c.id, label: `${c.level} ${c.arm}` })),
  ];

  const presentCount = rows.filter((r) => r.status === "PRESENT").length;
  const absentCount = rows.filter((r) => r.status === "ABSENT").length;
  const lateCount = rows.filter((r) => r.status === "LATE").length;
  const excusedCount = rows.filter((r) => r.status === "EXCUSED").length;

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader
        title="Mark Attendance"
        description="Record daily attendance for your class"
      />

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-56">
          {loadingClasses ? (
            <p className="text-sm text-gray-500">Loading classes…</p>
          ) : (
            <Select
              label="Class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={classOptions}
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {rows.length > 0 && (
          <Button variant="secondary" onClick={markAllPresent}>
            Mark All Present
          </Button>
        )}
      </div>

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex gap-4 mb-4 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">Present: {presentCount}</span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">Absent: {absentCount}</span>
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold">Late: {lateCount}</span>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Excused: {excusedCount}</span>
          {hasExisting && (
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs ml-auto">
              Attendance already recorded — submitting will update it
            </span>
          )}
        </div>
      )}

      {/* Sheet */}
      {!selectedClass ? (
        <div className="text-gray-500 py-12 text-center bg-white rounded-lg border">
          Select a class to begin marking attendance.
        </div>
      ) : loadingSheet ? (
        <div className="text-gray-500 py-12 text-center bg-white rounded-lg border">
          Loading students…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 py-12 text-center bg-white rounded-lg border">
          No students found in this class.
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Student</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Excuse Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.studentId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{row.studentName}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setStatus(row.studentId, opt.value)}
                          className={`px-2 py-1 rounded border text-xs font-semibold transition-all ${
                            row.status === opt.value
                              ? opt.color + " ring-2 ring-offset-1 ring-current"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "EXCUSED" ? (
                      <input
                        type="text"
                        placeholder="Reason for excuse…"
                        value={row.excuseReason}
                        onChange={(e) => setExcuseReason(row.studentId, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-4 border-t bg-gray-50 flex justify-end">
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : hasExisting ? "Update Attendance" : "Submit Attendance"}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
