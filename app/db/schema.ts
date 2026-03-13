import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  logoUrl: text("logo_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    userSchoolEmailUnique: uniqueIndex("users_school_email_unique").on(
      table.schoolId,
      table.email
    ),
    userSchoolIdx: index("users_school_idx").on(table.schoolId),
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    year: text("year").notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    sessionsSchoolYearUnique: uniqueIndex("sessions_school_year_unique").on(
      table.schoolId,
      table.year
    ),
    sessionsCurrentPerSchoolUnique: uniqueIndex("sessions_current_per_school_unique")
      .on(table.schoolId)
      .where(sql`${table.isCurrent} = 1`),
    sessionsSchoolCurrentIdx: index("sessions_school_current_idx").on(
      table.schoolId,
      table.isCurrent
    ),
  })
);

export const terms = sqliteTable(
  "terms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    termNumber: integer("term_number").notNull(),
    name: text("name").notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
    isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(false),
    paymentDate: integer("payment_date", { mode: "timestamp_ms" }),
    paymentReference: text("payment_reference"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    termsSessionNameUnique: uniqueIndex("terms_session_name_unique").on(
      table.sessionId,
      table.name
    ),
    termsSessionNumberUnique: uniqueIndex("terms_session_number_unique").on(
      table.sessionId,
      table.termNumber
    ),
    termsCurrentPerSessionUnique: uniqueIndex("terms_current_per_session_unique")
      .on(table.sessionId)
      .where(sql`${table.isCurrent} = 1`),
    termsSchoolSessionCurrentIdx: index("terms_school_session_current_idx").on(
      table.schoolId,
      table.sessionId,
      table.isCurrent
    ),
  })
);

export const classes = sqliteTable(
  "classes",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    level: text("level").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    classesSchoolNameUnique: uniqueIndex("classes_school_name_unique").on(
      table.schoolId,
      table.name
    ),
    classesSchoolLevelIdx: index("classes_school_level_idx").on(
      table.schoolId,
      table.level
    ),
  })
);

export const classArms = sqliteTable(
  "class_arms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    classArmsSchoolNameUnique: uniqueIndex("class_arms_school_name_unique").on(
      table.schoolId,
      table.name
    ),
    classArmsSchoolIdx: index("class_arms_school_idx").on(table.schoolId),
  })
);

export const sections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    armId: text("arm_id")
      .notNull()
      .references(() => classArms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    sectionsSchoolClassArmUnique: uniqueIndex("sections_school_class_arm_unique").on(
      table.schoolId,
      table.classId,
      table.armId
    ),
    sectionsSchoolNameUnique: uniqueIndex("sections_school_name_unique").on(
      table.schoolId,
      table.name
    ),
    sectionsSchoolIdx: index("sections_school_idx").on(table.schoolId),
    sectionsClassIdx: index("sections_class_idx").on(table.schoolId, table.classId),
  })
);

export const admissionSettings = sqliteTable(
  "admission_settings",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    prefix: text("prefix").notNull(),
    yearFormat: text("year_format").notNull(),
    numberLength: integer("number_length").notNull().default(3),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    admissionSettingsSchoolUnique: uniqueIndex("admission_settings_school_unique").on(
      table.schoolId
    ),
  })
);

export const students = sqliteTable(
  "students",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    admissionNumber: text("admission_number").notNull(),
    gender: text("gender"),
    dateOfBirth: integer("date_of_birth", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    studentsSchoolAdmissionUnique: uniqueIndex("students_school_admission_unique").on(
      table.schoolId,
      table.admissionNumber
    ),
    studentsSchoolAdmissionIdx: index("students_school_admission_idx").on(
      table.schoolId,
      table.admissionNumber
    ),
  })
);

export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    subjectsSchoolNameUnique: uniqueIndex("subjects_school_name_unique").on(
      table.schoolId,
      table.name
    ),
  })
);

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    enrollmentsUnique: uniqueIndex("enrollments_unique").on(
      table.studentId,
      table.sectionId,
      table.sessionId,
      table.termId
    ),
    enrollmentsLegacyUnique: uniqueIndex("enrollments_legacy_unique").on(
      table.studentId,
      table.classId,
      table.sessionId,
      table.termId
    ),
    enrollmentsStudentSessionTermIdx: index("enrollments_student_session_term_idx").on(
      table.schoolId,
      table.studentId,
      table.sessionId,
      table.termId
    ),
    enrollmentsSectionIdx: index("enrollments_section_idx").on(
      table.schoolId,
      table.sectionId,
      table.sessionId,
      table.termId
    ),
  })
);

export const results = sqliteTable(
  "results",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    resultsUnique: uniqueIndex("results_unique").on(
      table.studentId,
      table.subjectId,
      table.sectionId,
      table.sessionId,
      table.termId
    ),
    resultsLegacyUnique: uniqueIndex("results_legacy_unique").on(
      table.studentId,
      table.subjectId,
      table.classId,
      table.sessionId,
      table.termId
    ),
    resultsStudentIdx: index("results_student_idx").on(
      table.schoolId,
      table.studentId,
      table.sessionId,
      table.termId
    ),
    resultsClassIdx: index("results_class_idx").on(
      table.schoolId,
      table.classId,
      table.sessionId,
      table.termId
    ),
    resultsSubjectIdx: index("results_subject_idx").on(
      table.schoolId,
      table.subjectId,
      table.sessionId,
      table.termId
    ),
    resultsSectionIdx: index("results_section_idx").on(
      table.schoolId,
      table.sectionId,
      table.sessionId,
      table.termId
    ),
  })
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    metaJson: text("meta_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    auditSchoolCreatedIdx: index("audit_school_created_idx").on(
      table.schoolId,
      table.createdAt
    ),
  })
);
