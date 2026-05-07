"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, LoadingSpinner } from "@/app/components/UIComponents";

interface TeacherProfile {
  _id: string;
  fullName: string;
  email: string;
  classTeacherOf?: {
    _id: string;
    name: string;
    level: string;
    arm: string;
  } | null;
  subjectsAndClasses: Array<{
    subjectId: { _id: string; name: string; code: string };
    classIds: Array<{ _id: string; name: string }>;
  }>;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface Class {
  _id: string;
  name: string;
  level: string;
  arm: string;
}

export default function TeacherProfilePage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params?.id as string;

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClassTeacherModal, setShowClassTeacherModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClassesForSubject, setSelectedClassesForSubject] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!teacherId) {
      return;
    }

    fetchTeacherProfile();
    fetchAllSubjects();
    fetchAllClasses();
  }, [teacherId]);

  const fetchTeacherProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teachers/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTeacher(data.teacher);
      } else {
        toast.error("Failed to load teacher profile");
      }
    } catch (error) {
      toast.error("Error loading teacher profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchAllClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/classes/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleAssignClassTeacher = async () => {
    if (!selectedClassForTeacher) {
      toast.error("Please select a class");
      return;
    }

    if (!teacherId) {
      toast.error("Teacher ID not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teachers/${teacherId}/assign-class-teacher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classId: selectedClassForTeacher }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Class teacher assigned successfully!");
        setShowClassTeacherModal(false);
        setSelectedClassForTeacher("");
        fetchTeacherProfile();
      } else {
        toast.error(data.error || "Failed to assign class teacher");
      }
    } catch (error) {
      toast.error("Error assigning class teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveClassTeacher = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teachers/${teacherId}/remove-class-teacher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Class teacher removed successfully!");
        fetchTeacherProfile();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to remove class teacher");
      }
    } catch (error) {
      toast.error("Error removing class teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubject = async () => {
    if (!selectedSubject || selectedClassesForSubject.length === 0) {
      toast.error("Please select a subject and at least one class");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teachers/${teacherId}/assign-subject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectId: selectedSubject,
          classIds: selectedClassesForSubject,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Subject assigned successfully!");
        setShowSubjectModal(false);
        setSelectedSubject("");
        setSelectedClassesForSubject([]);
        fetchTeacherProfile();
      } else {
        toast.error(data.error || "Failed to assign subject");
      }
    } catch (error) {
      toast.error("Error assigning subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    toast("Remove subject from teacher?", {
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/teachers/${teacherId}/remove-subject`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ subjectId }),
            });

            if (response.ok) {
              toast.success("Subject removed successfully!");
              fetchTeacherProfile();
            } else {
              const data = await response.json();
              toast.error(data.error || "Failed to remove subject");
            }
          } catch (error) {
            toast.error("Error removing subject");
          }
        },
      }
    });
  };

  const toggleClassForSubject = (classId: string) => {
    setSelectedClassesForSubject(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout role="ADMIN">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout role="ADMIN">
        <div className="p-6 text-center">
          <p className="text-gray-500">Teacher not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title={teacher.fullName}
        description="Teacher Profile & Assignments"
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-[0_8px_20px_-16px_rgba(15,23,42,0.32)] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Personal Information</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-slate-50/60 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Full Name</p>
              <p className="font-semibold text-slate-800">{teacher.fullName}</p>
            </div>
            <div className="bg-slate-50/60 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Email</p>
              <p className="font-semibold text-slate-800">{teacher.email}</p>
            </div>
          </div>
        </div>

        {/* Class Teacher Assignment */}
        <div className="bg-white rounded-2xl shadow-[0_8px_20px_-16px_rgba(15,23,42,0.32)] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Class Teacher</p>
            {!teacher.classTeacherOf ? (
              <button
                onClick={() => setShowClassTeacherModal(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200"
              >
                + Assign as Class Teacher
              </button>
            ) : (
              <button
                onClick={handleRemoveClassTeacher}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-linear-to-br from-red-500 to-red-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_16px_-4px_rgba(239,68,68,0.5)] transition-all duration-200 disabled:opacity-50"
              >
                Remove Assignment
              </button>
            )}
          </div>

          {teacher.classTeacherOf ? (
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                {(teacher.classTeacherOf.name || "").charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-emerald-800 text-sm">{teacher.classTeacherOf.name}</p>
                <p className="text-xs text-emerald-600">Class Teacher</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-xl">👤</span>
              <p className="text-sm text-slate-500">Not assigned as a class teacher yet</p>
            </div>
          )}
        </div>

        {/* Subject Assignments */}
        <div className="bg-white rounded-2xl shadow-[0_8px_20px_-16px_rgba(15,23,42,0.32)] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Subject Assignments</p>
            <button
              onClick={() => setShowSubjectModal(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200"
            >
              + Assign Subject
            </button>
          </div>

          {teacher.subjectsAndClasses.length === 0 ? (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-xl">📚</span>
              <p className="text-sm text-slate-500">No subjects assigned yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {teacher.subjectsAndClasses.map((assignment) => (
                <div
                  key={assignment.subjectId._id}
                  className="bg-slate-50/60 rounded-2xl p-4 hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,0.25)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{assignment.subjectId.name}</p>
                      {assignment.subjectId.code && (
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{assignment.subjectId.code}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSubject(assignment.subjectId._id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    Teaching in {assignment.classIds.length} class{assignment.classIds.length !== 1 ? "es" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {assignment.classIds.map((cls) => (
                      <span
                        key={cls._id}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold"
                      >
                        {cls.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Class Teacher Modal */}
      {showClassTeacherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(15,23,42,0.35)] p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-5">Assign as Class Teacher</h3>
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Select Class</label>
              <select
                value={selectedClassForTeacher}
                onChange={(e) => setSelectedClassForTeacher(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a class…</option>
                {allClasses.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name || `${cls.level} ${cls.arm}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAssignClassTeacher}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? "Assigning…" : "Assign"}
              </button>
              <button
                onClick={() => { setShowClassTeacherModal(false); setSelectedClassForTeacher(""); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Assignment Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(15,23,42,0.35)] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-5">Assign Subject</h3>
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Select Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a subject…</option>
                {allSubjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}{subject.code ? ` (${subject.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Select Classes to Teach</label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto rounded-xl bg-slate-50 p-3">
                {allClasses.map((cls) => (
                  <label
                    key={cls._id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-colors ${selectedClassesForSubject.includes(cls._id) ? "bg-indigo-50 text-indigo-700" : "hover:bg-white"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClassesForSubject.includes(cls._id)}
                      onChange={() => toggleClassForSubject(cls._id)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm font-medium">{cls.name || `${cls.level} ${cls.arm}`}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAssignSubject}
                disabled={isSubmitting || !selectedSubject || selectedClassesForSubject.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)] transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? "Assigning…" : "Assign Subject"}
              </button>
              <button
                onClick={() => { setShowSubjectModal(false); setSelectedSubject(""); setSelectedClassesForSubject([]); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
