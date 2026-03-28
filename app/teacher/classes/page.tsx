"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { Button, PageHeader, DataTable } from "@/app/components/UIComponents";

interface ClassInfo {
  id: string;
  level: string;
  arm: string;
  studentCount: number;
  subjectCount: number;
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface AttendanceRow {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  excuseReason: string;
}

export default function TeacherClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherClass, setClassTeacherClass] = useState<{ _id: string; level: string; arm: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Attendance modal state
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendanceClassId, setAttendanceClassId] = useState("");
  const [attendanceClassName, setAttendanceClassName] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const fetchTeacherClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teachers/create", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const profile = data.profile;

        const classMap = new Map<string, ClassInfo>();

        if (profile?.subjectsAndClasses) {
          profile.subjectsAndClasses.forEach((assignment: { classIds?: { _id: string; level: string; arm: string }[] }) => {
            assignment.classIds?.forEach((classInfo: { _id: string; level: string; arm: string }) => {
              if (classInfo && classInfo._id) {
                const classId = classInfo._id.toString();
                const existing = classMap.get(classId);
                classMap.set(classId, {
                  id: classId,
                  level: classInfo.level,
                  arm: classInfo.arm,
                  studentCount: existing?.studentCount || 0,
                  subjectCount: existing ? existing.subjectCount + 1 : 1,
                });
              }
            });
          });
        }

        if (profile?.classTeacherOf) {
          setIsClassTeacher(true);
          setClassTeacherClass(profile.classTeacherOf);

          if (profile.classTeacherOf._id) {
            const classTeacherId = String(profile.classTeacherOf._id);
            const existing = classMap.get(classTeacherId);
            classMap.set(classTeacherId, {
              id: classTeacherId,
              level: String(profile.classTeacherOf.level || ""),
              arm: String(profile.classTeacherOf.arm || ""),
              studentCount: Number(profile.classTeacherOf.studentCount || 0),
              subjectCount: existing ? existing.subjectCount : 0,
            });
          }
        } else {
          setIsClassTeacher(false);
          setClassTeacherClass(null);
        }

        setClasses(Array.from(classMap.values()));
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error("Failed to fetch teacher classes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}") as { role?: string };

    if (!token || user.role !== "TEACHER") {
      router.push("/login");
      return;
    }

    fetchTeacherClasses();
  }, [router, fetchTeacherClasses]);

  const openAttendanceModal = async (classId: string, className: string) => {
    setAttendanceClassId(classId);
    setAttendanceClassName(className);
    setAttendanceModal(true);
    await loadAttendanceSheet(classId, attendanceDate);
  };

  const loadAttendanceSheet = async (classId: string, date: string) => {
    setLoadingSheet(true);
    try {
      const token = localStorage.getItem("token");

      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`/api/students/by-class?classId=${encodeURIComponent(classId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/attendance/mark?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : { attendance: [] };

      const existingByStudent = new Map<string, { status: string; excuseReason?: string }>();
      for (const row of attendanceData.attendance || []) {
        existingByStudent.set(String(row.studentId), {
          status: String(row.status || "PRESENT").toUpperCase(),
          excuseReason: row.excuseReason || "",
        });
      }

      const rows: AttendanceRow[] = (studentsData.students || []).map((s: { id?: string; _id?: string; fullName?: string; name?: string }) => {
        const existing = existingByStudent.get(String(s.id || s._id));
        return {
          studentId: String(s.id || s._id),
          studentName: s.fullName || s.name || "Unknown",
          status: (existing?.status as AttendanceStatus) || "PRESENT",
          excuseReason: existing?.excuseReason || "",
        };
      });

      setAttendanceRows(rows);
    } catch (err) {
      console.error("Load attendance sheet error:", err);
      toast.error("Failed to load students");
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleDateChange = async (newDate: string) => {
    setAttendanceDate(newDate);
    if (attendanceClassId) {
      await loadAttendanceSheet(attendanceClassId, newDate);
    }
  };

  const updateRow = (index: number, field: "status" | "excuseReason", value: string) => {
    setAttendanceRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveAttendance = async () => {
    if (attendanceRows.length === 0) {
      toast.error("No students loaded");
      return;
    }

    setSavingAttendance(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          classId: attendanceClassId,
          attendanceDate,
          records: attendanceRows.map((row) => ({
            studentId: row.studentId,
            status: row.status,
            excuseReason: row.excuseReason || undefined,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to save attendance");
        return;
      }

      toast.success(`Attendance saved — ${data.summary?.totalProcessed ?? attendanceRows.length} record(s)`);
      setAttendanceModal(false);
    } catch (err) {
      console.error("Save attendance error:", err);
      toast.error("Failed to save attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  const columns = [
    {
      header: "Class",
      accessor: "level" as keyof ClassInfo,
      render: (value: string, row: ClassInfo) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{value} {row.arm}</span>
          {classTeacherClass && classTeacherClass._id === row.id && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
              Class Teacher
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Students",
      accessor: "studentCount" as keyof ClassInfo,
      render: (value: number) => `${value || "0"} students`,
    },
    {
      header: "Subjects Teaching",
      accessor: "subjectCount" as keyof ClassInfo,
      render: (value: number) => (value ? `${value} ${value === 1 ? "subject" : "subjects"}` : "N/A"),
    },
    {
      header: "Attendance",
      accessor: "id" as keyof ClassInfo,
      render: (_: unknown, row: ClassInfo) => (
        <Button
          size="sm"
          onClick={() => openAttendanceModal(row.id, `${row.level} ${row.arm}`)}
        >
          Mark Attendance
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER">
      <PageHeader title="My Classes" description="Classes you teach and manage" />

      {isClassTeacher && classTeacherClass && (
        <div className="mb-6 bg-linear-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Class Teacher Assignment</h3>
          <p className="text-xl font-bold">
            {classTeacherClass.level} {classTeacherClass.arm}
          </p>
          <p className="text-sm mt-2 opacity-90">You can add and manage students for this class</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {classes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No class assignments yet</p>
            <p className="text-sm">Contact your administrator to assign you to classes</p>
          </div>
        ) : (
          <DataTable data={classes} columns={columns} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-600 text-2xl font-bold">{classes.length}</div>
          <div className="text-sm text-blue-800">Total Classes</div>
        </div>
        {isClassTeacher && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-600 text-2xl font-bold">1</div>
            <div className="text-sm text-purple-800">Class Teacher Role</div>
          </div>
        )}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-600 text-2xl font-bold">
            {classes.reduce((sum, c) => sum + (c.subjectCount || 0), 0)}
          </div>
          <div className="text-sm text-green-800">Subjects Teaching</div>
        </div>
      </div>

      {/* Attendance Modal */}
      {attendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Mark Attendance</h2>
                <p className="text-sm text-gray-500">{attendanceClassName}</p>
              </div>
              <button
                onClick={() => setAttendanceModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingSheet ? (
                <div className="text-center py-10 text-gray-500">Loading students…</div>
              ) : attendanceRows.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No students found for this class.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Student</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Reason (if excused)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((row, index) => (
                      <tr key={row.studentId} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{row.studentName}</td>
                        <td className="px-3 py-2 text-center">
                          <select
                            value={row.status}
                            onChange={(e) => updateRow(index, "status", e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="EXCUSED">Excused</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {(row.status === "EXCUSED" || row.status === "ABSENT") && (
                            <input
                              type="text"
                              placeholder="Reason…"
                              value={row.excuseReason}
                              onChange={(e) => updateRow(index, "excuseReason", e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button onClick={() => setAttendanceModal(false)}>Cancel</Button>
              <Button
                onClick={handleSaveAttendance}
                disabled={savingAttendance || loadingSheet || attendanceRows.length === 0}
              >
                {savingAttendance ? "Saving…" : "Save Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
