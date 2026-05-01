import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { schools, students, users } from "@/app/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const schoolRows = await d1
      .select({
        id: schools.id,
        name: schools.name,
        address: schools.address,
        createdAt: schools.createdAt,
      })
      .from(schools)
      .orderBy(desc(schools.createdAt));

    const [userRows, studentRows] = await Promise.all([
      d1.select({ id: users.id, schoolId: users.schoolId, role: users.role, email: users.email }).from(users),
      d1.select({ id: students.id, schoolId: students.schoolId }).from(students),
    ]);

    const usersBySchool = new Map<string, Array<{ id: string; role: string; email: string }>>();
    for (const row of userRows) {
      const bucket = usersBySchool.get(row.schoolId) || [];
      bucket.push({ id: row.id, role: row.role, email: row.email });
      usersBySchool.set(row.schoolId, bucket);
    }

    const studentsBySchool = new Map<string, number>();
    for (const row of studentRows) {
      studentsBySchool.set(row.schoolId, (studentsBySchool.get(row.schoolId) || 0) + 1);
    }

    const schoolsPayload = schoolRows.map((school) => {
      const schoolUsers = usersBySchool.get(school.id) || [];
      const teachers = schoolUsers.filter((entry) => entry.role === "TEACHER").length;
      const parents = schoolUsers.filter((entry) => entry.role === "PARENT").length;
      const admins = schoolUsers.filter((entry) => entry.role === "ADMIN");
      const adminEmail = admins[0]?.email || "";

      return {
        id: school.id,
        name: school.name,
        email: adminEmail,
        phone: "",
        state: school.address || "N/A",
        teachers,
        parents,
        students: studentsBySchool.get(school.id) || 0,
        totalUsers: schoolUsers.length,
        createdAt: school.createdAt ? school.createdAt.toISOString() : new Date(0).toISOString(),
      };
    });

    const globalStats = {
      totalSchools: schoolsPayload.length,
      totalTeachers: schoolsPayload.reduce((sum, item) => sum + item.teachers, 0),
      totalParents: schoolsPayload.reduce((sum, item) => sum + item.parents, 0),
      totalStudents: schoolsPayload.reduce((sum, item) => sum + item.students, 0),
      totalAdmins: userRows.filter((row) => row.role === "ADMIN").length,
      totalUsers: userRows.length,
    };

    if (user.schoolId) {
      const ownSchool = await d1
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);

      if (!ownSchool[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      schools: schoolsPayload,
      globalStats,
    });
  } catch (error: unknown) {
    console.error("Superadmin analytics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}