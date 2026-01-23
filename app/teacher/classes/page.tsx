"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, DataTable } from "@/app/components/UIComponents";

interface ClassInfo {
  id: string;
  level: string;
  arm: string;
  studentCount: number;
  subjectCount: number;
}

export default function TeacherClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherClass, setClassTeacherClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "TEACHER") {
      router.push("/login");
      return;
    }

    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teachers/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Extract classes from subjectsAndClasses
        const classMap = new Map<string, ClassInfo>();
        
        if (data.subjectsAndClasses) {
          data.subjectsAndClasses.forEach((assignment: any) => {
            assignment.classIds?.forEach((classInfo: any) => {
              if (classInfo && classInfo._id) {
                classMap.set(classInfo._id.toString(), {
                  id: classInfo._id.toString(),
                  level: classInfo.level,
                  arm: classInfo.arm,
                  studentCount: 0, // Will be populated by another API call if needed
                  subjectCount: 1 // At least one subject
                });
              }
            });
          });
        }

        // Check if class teacher
        if (data.classTeacherOf) {
          setIsClassTeacher(true);
          setClassTeacherClass(data.classTeacherOf);
          
          if (data.classTeacherOf._id) {
            classMap.set(data.classTeacherOf._id.toString(), {
              id: data.classTeacherOf._id.toString(),
              level: data.classTeacherOf.level,
              arm: data.classTeacherOf.arm,
              studentCount: 0,
              subjectCount: 0
            });
          }
        }

        setClasses(Array.from(classMap.values()));
      }
    } catch (error) {
      console.error("Failed to fetch teacher classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      header: "Class", 
      accessor: "level" as keyof ClassInfo,
      render: (value: any, row: ClassInfo) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{value} {row.arm}</span>
          {classTeacherClass && classTeacherClass._id === row.id && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
              Class Teacher
            </span>
          )}
        </div>
      )
    },
    { 
      header: "Students", 
      accessor: "studentCount" as keyof ClassInfo,
      render: (value: any) => `${value || '0'} students`
    },
    { 
      header: "Subjects Teaching", 
      accessor: "subjectCount" as keyof ClassInfo,
      render: (value: any) => value ? `${value} ${value === 1 ? 'subject' : 'subjects'}` : 'N/A'
    }
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
      <PageHeader
        title="My Classes"
        description="Classes you teach and manage"
      />

      {isClassTeacher && classTeacherClass && (
        <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">📚 Class Teacher Assignment</h3>
          <p className="text-xl font-bold">
            {classTeacherClass.level} {classTeacherClass.arm}
          </p>
          <p className="text-sm mt-2 opacity-90">
            You can add and manage students for this class
          </p>
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
    </DashboardLayout>
  );
}
