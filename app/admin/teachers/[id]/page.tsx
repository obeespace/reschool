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
  };
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
    if (!confirm("Are you sure you want to remove this subject?")) return;

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

      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Full Name</label>
              <p className="font-medium">{teacher.fullName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="font-medium">{teacher.email}</p>
            </div>
          </div>
        </div>

        {/* Class Teacher Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Class Teacher</h2>
            {!teacher.classTeacherOf ? (
              <button
                onClick={() => setShowClassTeacherModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                + Assign as Class Teacher
              </button>
            ) : (
              <button
                onClick={handleRemoveClassTeacher}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                Remove Class Teacher
              </button>
            )}
          </div>

          {teacher.classTeacherOf ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                <span className="font-semibold">Class Teacher of:</span>{" "}
                {teacher.classTeacherOf.name || `${teacher.classTeacherOf.level} ${teacher.classTeacherOf.arm}`}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Not assigned as a class teacher</p>
          )}
        </div>

        {/* Subject Assignments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Subject Assignments</h2>
            <button
              onClick={() => setShowSubjectModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + Assign Subject
            </button>
          </div>

          {teacher.subjectsAndClasses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No subjects assigned yet</p>
          ) : (
            <div className="space-y-4">
              {teacher.subjectsAndClasses.map((assignment) => (
                <div
                  key={assignment.subjectId._id}
                  className="p-4 border-2 rounded-lg hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {assignment.subjectId.name}
                        <span className="text-sm text-gray-500 ml-2">
                          ({assignment.subjectId.code})
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Teaching in {assignment.classIds.length} class{assignment.classIds.length !== 1 ? "es" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveSubject(assignment.subjectId._id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {assignment.classIds.map((cls) => (
                      <span
                        key={cls._id}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Assign as Class Teacher</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Class</label>
              <select
                value={selectedClassForTeacher}
                onChange={(e) => setSelectedClassForTeacher(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select a class...</option>
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
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSubmitting ? "Assigning..." : "Assign"}
              </button>
              <button
                onClick={() => {
                  setShowClassTeacherModal(false);
                  setSelectedClassForTeacher("");
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Assignment Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Assign Subject</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select a subject...</option>
                {allSubjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Classes to Teach</label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {allClasses.map((cls) => (
                  <label
                    key={cls._id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClassesForSubject.includes(cls._id)}
                      onChange={() => toggleClassForSubject(cls._id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{cls.name || `${cls.level} ${cls.arm}`}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignSubject}
                disabled={isSubmitting || !selectedSubject || selectedClassesForSubject.length === 0}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSubmitting ? "Assigning..." : "Assign Subject"}
              </button>
              <button
                onClick={() => {
                  setShowSubjectModal(false);
                  setSelectedSubject("");
                  setSelectedClassesForSubject([]);
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
