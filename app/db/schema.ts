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

export const classSubjects = sqliteTable(
  "class_subjects",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    classSubjectsUnique: uniqueIndex("class_subjects_unique").on(
      table.schoolId,
      table.classId,
      table.subjectId
    ),
    classSubjectsClassIdx: index("class_subjects_class_idx").on(
      table.schoolId,
      table.classId
    ),
    classSubjectsSubjectIdx: index("class_subjects_subject_idx").on(
      table.schoolId,
      table.subjectId
    ),
  })
);

export const parentWardLinks = sqliteTable(
  "parent_ward_links",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    parentId: text("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull().default("GUARDIAN"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    parentWardLinksUnique: uniqueIndex("parent_ward_links_unique").on(
      table.schoolId,
      table.parentId,
      table.studentId
    ),
    parentWardLinksParentIdx: index("parent_ward_links_parent_idx").on(
      table.schoolId,
      table.parentId
    ),
    parentWardLinksStudentIdx: index("parent_ward_links_student_idx").on(
      table.schoolId,
      table.studentId
    ),
  })
);

export const teacherClassAssignments = sqliteTable(
  "teacher_class_assignments",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    teacherClassTeacherUnique: uniqueIndex("teacher_class_teacher_unique").on(
      table.schoolId,
      table.teacherId
    ),
    teacherClassClassUnique: uniqueIndex("teacher_class_class_unique").on(
      table.schoolId,
      table.classId
    ),
    teacherClassAssignmentsTeacherIdx: index("teacher_class_assignments_teacher_idx").on(
      table.schoolId,
      table.teacherId
    ),
  })
);

export const teacherSubjectAssignments = sqliteTable(
  "teacher_subject_assignments",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    teacherSubjectAssignmentsUnique: uniqueIndex("teacher_subject_assignments_unique").on(
      table.schoolId,
      table.teacherId,
      table.subjectId,
      table.classId
    ),
    teacherSubjectAssignmentsTeacherIdx: index("teacher_subject_assignments_teacher_idx").on(
      table.schoolId,
      table.teacherId
    ),
    teacherSubjectAssignmentsClassIdx: index("teacher_subject_assignments_class_idx").on(
      table.schoolId,
      table.classId
    ),
    teacherSubjectAssignmentsSubjectIdx: index("teacher_subject_assignments_subject_idx").on(
      table.schoolId,
      table.subjectId
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

export const dailyMarks = sqliteTable(
  "daily_marks",
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
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    assessmentType: text("assessment_type").notNull(),
    score: real("score").notNull(),
    maxScore: real("max_score").notNull(),
    weightage: real("weightage").notNull(),
    feedbackNotes: text("feedback_notes"),
    modificationHistoryJson: text("modification_history_json").notNull().default("[]"),
    recordedDate: integer("recorded_date", { mode: "timestamp_ms" }).notNull(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastModifiedBy: text("last_modified_by").references(() => users.id, { onDelete: "set null" }),
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    dailyMarksTermIdx: index("daily_marks_term_idx").on(
      table.schoolId,
      table.termId,
      table.classId,
      table.subjectId
    ),
    dailyMarksStudentIdx: index("daily_marks_student_idx").on(
      table.schoolId,
      table.studentId,
      table.termId
    ),
    dailyMarksTeacherIdx: index("daily_marks_teacher_idx").on(
      table.schoolId,
      table.teacherId,
      table.termId
    ),
  })
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    attendanceDate: integer("attendance_date", { mode: "timestamp_ms" }).notNull(),
    status: text("status").notNull(),
    excuseReason: text("excuse_reason"),
    markedBy: text("marked_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    markedTime: integer("marked_time", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    attendanceUnique: uniqueIndex("attendance_unique").on(
      table.schoolId,
      table.studentId,
      table.termId,
      table.attendanceDate
    ),
    attendanceClassIdx: index("attendance_class_idx").on(
      table.schoolId,
      table.classId,
      table.termId,
      table.attendanceDate
    ),
    attendanceStudentIdx: index("attendance_student_idx").on(
      table.schoolId,
      table.studentId,
      table.termId
    ),
  })
);

export const teacherRemarks = sqliteTable(
  "teacher_remarks",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    academicPerformance: text("academic_performance"),
    classParticipation: text("class_participation"),
    attitudeToDuties: text("attitude_to_duties"),
    customRemark: text("custom_remark"),
    promotionRecommendation: text("promotion_recommendation"),
    remarkedBy: text("remarked_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    remarkedDate: integer("remarked_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    teacherRemarksIdx: index("teacher_remarks_idx").on(
      table.schoolId,
      table.studentId,
      table.termId
    ),
    teacherRemarksUnique: uniqueIndex("teacher_remarks_unique").on(
      table.schoolId,
      table.studentId,
      table.termId,
      table.type,
      table.subjectId
    ),
  })
);

export const reportCards = sqliteTable(
  "report_cards",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    className: text("class_name").notNull(),
    termNumber: integer("term_number").notNull(),
    yearLabel: text("year_label").notNull(),
    subjectScoresJson: text("subject_scores_json").notNull().default("[]"),
    totalScore: real("total_score").notNull().default(0),
    averageScore: real("average_score").notNull().default(0),
    classRanking: integer("class_ranking"),
    classSize: integer("class_size"),
    overallRemark: text("overall_remark"),
    attendancePercentage: real("attendance_percentage"),
    comportmentJson: text("comportment_json").notNull().default("{}"),
    promotionStatus: text("promotion_status"),
    repeatReason: text("repeat_reason"),
    generatedDate: integer("generated_date", { mode: "timestamp_ms" }).notNull(),
    approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
    printCount: integer("print_count").notNull().default(0),
    printHistoryJson: text("print_history_json").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    reportCardsUnique: uniqueIndex("report_cards_unique").on(
      table.schoolId,
      table.studentId,
      table.termId
    ),
    reportCardsClassIdx: index("report_cards_class_idx").on(
      table.schoolId,
      table.classId,
      table.termId
    ),
  })
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientRole: text("recipient_role").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    actionUrl: text("action_url"),
    deliveryChannelsJson: text("delivery_channels_json").notNull().default('["IN_APP"]'),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    priority: text("priority").notNull().default("NORMAL"),
    createdDate: integer("created_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    notificationsRecipientIdx: index("notifications_recipient_idx").on(
      table.schoolId,
      table.recipientId,
      table.readAt
    ),
    notificationsTypeIdx: index("notifications_type_idx").on(
      table.schoolId,
      table.type,
      table.createdDate
    ),
  })
);

export const announcements = sqliteTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    announcementType: text("announcement_type").notNull().default("GENERAL"),
    targetAudience: text("target_audience").notNull().default("ALL"),
    classId: text("class_id").references(() => classes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    createdDate: integer("created_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    announcementsSchoolCreatedIdx: index("announcements_school_created_idx").on(
      table.schoolId,
      table.createdDate
    ),
    announcementsAudienceIdx: index("announcements_audience_idx").on(
      table.schoolId,
      table.targetAudience,
      table.createdDate
    ),
    announcementsClassIdx: index("announcements_class_idx").on(
      table.schoolId,
      table.classId,
      table.createdDate
    ),
  })
);

export const announcementReads = sqliteTable(
  "announcement_reads",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    readerId: text("reader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: integer("read_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    announcementReadsUnique: uniqueIndex("announcement_reads_unique").on(
      table.schoolId,
      table.announcementId,
      table.readerId
    ),
    announcementReadsReaderIdx: index("announcement_reads_reader_idx").on(
      table.schoolId,
      table.readerId,
      table.readAt
    ),
  })
);

export const studentLifecycleRecords = sqliteTable(
  "student_lifecycle_records",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    admissionDate: integer("admission_date", { mode: "timestamp_ms" }),
    admissionClass: text("admission_class"),
    currentClass: text("current_class"),
    currentStatus: text("current_status").notNull().default("ACTIVE"),
    milestonesJson: text("milestones_json").notNull().default("[]"),
    graduationDate: integer("graduation_date", { mode: "timestamp_ms" }),
    certificateId: text("certificate_id"),
    certificationStatus: text("certification_status").notNull().default("PENDING"),
    suspensionCount: integer("suspension_count").notNull().default(0),
    withdrawalReason: text("withdrawal_reason"),
    overallPerformanceJson: text("overall_performance_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    studentLifecycleUnique: uniqueIndex("student_lifecycle_unique").on(
      table.schoolId,
      table.studentId
    ),
    studentLifecycleStatusIdx: index("student_lifecycle_status_idx").on(
      table.schoolId,
      table.currentStatus
    ),
  })
);

export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    studentName: text("student_name").notNull(),
    studentAdmissionNumber: text("student_admission_number").notNull(),
    admissionYear: integer("admission_year"),
    graduationYear: integer("graduation_year"),
    classLevel: text("class_level").notNull(),
    certificateNumber: text("certificate_number").notNull(),
    issuedDate: integer("issued_date", { mode: "timestamp_ms" }),
    signatureApprovalStatus: text("signature_approval_status").notNull().default("PENDING"),
    signedByPrincipalId: text("signed_by_principal_id").references(() => users.id, { onDelete: "set null" }),
    signedByPrincipalName: text("signed_by_principal_name"),
    signatureDate: integer("signature_date", { mode: "timestamp_ms" }),
    reprintCount: integer("reprint_count").notNull().default(0),
    reprintHistoryJson: text("reprint_history_json").notNull().default("[]"),
    digitalHash: text("digital_hash"),
    qrCode: text("qr_code"),
    isVerifiable: integer("is_verifiable", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    certificatesStudentUnique: uniqueIndex("certificates_student_unique").on(
      table.schoolId,
      table.studentId
    ),
    certificatesNumberUnique: uniqueIndex("certificates_number_unique").on(
      table.schoolId,
      table.certificateNumber
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

export const teacherRewardWinners = sqliteTable(
  "teacher_reward_winners",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    points: real("points").notNull(),
    breakdownJson: text("breakdown_json").notNull().default("{}"),
    finalizedBy: text("finalized_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    teacherRewardTermTeacherUnique: uniqueIndex("teacher_reward_term_teacher_unique").on(
      table.schoolId,
      table.termId,
      table.teacherId
    ),
    teacherRewardTermRankUnique: uniqueIndex("teacher_reward_term_rank_unique").on(
      table.schoolId,
      table.termId,
      table.rank
    ),
    teacherRewardTermIdx: index("teacher_reward_term_idx").on(
      table.schoolId,
      table.termId,
      table.rank
    ),
  })
);
