import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const schools = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const users = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    userSchoolEmailUnique: uniqueIndex("users_school_email_unique").on(
      table.schoolId,
      table.email
    ),
    userSchoolIdx: index("users_school_idx").on(table.schoolId),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    year: text("year").notNull(),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }).notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    sessionsSchoolYearUnique: uniqueIndex("sessions_school_year_unique").on(
      table.schoolId,
      table.year
    ),
    sessionsCurrentPerSchoolUnique: uniqueIndex("sessions_current_per_school_unique")
      .on(table.schoolId)
      .where(sql`${table.isCurrent} = true`),
    sessionsSchoolCurrentIdx: index("sessions_school_current_idx").on(
      table.schoolId,
      table.isCurrent
    ),
  })
);

export const terms = pgTable(
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
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }).notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    isPaid: boolean("is_paid").notNull().default(false),
    isClosed: boolean("is_closed").notNull().default(false),
    paymentDate: timestamp("payment_date", { mode: "date" }),
    paymentReference: text("payment_reference"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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
      .where(sql`${table.isCurrent} = true`),
    termsSchoolSessionCurrentIdx: index("terms_school_session_current_idx").on(
      table.schoolId,
      table.sessionId,
      table.isCurrent
    ),
  })
);

export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    level: text("level").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const classArms = pgTable(
  "class_arms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    classArmsSchoolNameUnique: uniqueIndex("class_arms_school_name_unique").on(
      table.schoolId,
      table.name
    ),
    classArmsSchoolIdx: index("class_arms_school_idx").on(table.schoolId),
  })
);

export const sections = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const admissionSettings = pgTable(
  "admission_settings",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    prefix: text("prefix").notNull(),
    yearFormat: text("year_format").notNull(),
    numberLength: integer("number_length").notNull().default(3),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    admissionSettingsSchoolUnique: uniqueIndex("admission_settings_school_unique").on(
      table.schoolId
    ),
  })
);

export const students = pgTable(
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
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const subjects = pgTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    subjectsSchoolNameUnique: uniqueIndex("subjects_school_name_unique").on(
      table.schoolId,
      table.name
    ),
  })
);

export const classSubjects = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const parentWardLinks = pgTable(
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
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const teacherClassAssignments = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const teacherSubjectAssignments = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const enrollments = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const results = pgTable(
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
    score: doublePrecision("score").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const dailyMarks = pgTable(
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
    score: doublePrecision("score").notNull(),
    maxScore: doublePrecision("max_score").notNull(),
    weightage: doublePrecision("weightage").notNull(),
    feedbackNotes: text("feedback_notes"),
    modificationHistoryJson: text("modification_history_json").notNull().default("[]"),
    recordedDate: timestamp("recorded_date", { mode: "date" }).notNull(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastModifiedBy: text("last_modified_by").references(() => users.id, { onDelete: "set null" }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const attendanceRecords = pgTable(
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
    attendanceDate: timestamp("attendance_date", { mode: "date" }).notNull(),
    status: text("status").notNull(),
    excuseReason: text("excuse_reason"),
    markedBy: text("marked_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    markedTime: timestamp("marked_time", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const teacherRemarks = pgTable(
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
    remarkedDate: timestamp("remarked_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const reportCards = pgTable(
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
    totalScore: doublePrecision("total_score").notNull().default(0),
    averageScore: doublePrecision("average_score").notNull().default(0),
    classRanking: integer("class_ranking"),
    classSize: integer("class_size"),
    overallRemark: text("overall_remark"),
    attendancePercentage: doublePrecision("attendance_percentage"),
    comportmentJson: text("comportment_json").notNull().default("{}"),
    promotionStatus: text("promotion_status"),
    repeatReason: text("repeat_reason"),
    generatedDate: timestamp("generated_date", { mode: "date" }).notNull(),
    approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
    printCount: integer("print_count").notNull().default(0),
    printHistoryJson: text("print_history_json").notNull().default("[]"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const notifications = pgTable(
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
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    readAt: timestamp("read_at", { mode: "date" }),
    priority: text("priority").notNull().default("NORMAL"),
    createdDate: timestamp("created_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const announcements = pgTable(
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
    createdDate: timestamp("created_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const announcementReads = pgTable(
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
    readAt: timestamp("read_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const studentLifecycleRecords = pgTable(
  "student_lifecycle_records",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    admissionDate: timestamp("admission_date", { mode: "date" }),
    admissionClass: text("admission_class"),
    currentClass: text("current_class"),
    currentStatus: text("current_status").notNull().default("ACTIVE"),
    milestonesJson: text("milestones_json").notNull().default("[]"),
    graduationDate: timestamp("graduation_date", { mode: "date" }),
    certificateId: text("certificate_id"),
    certificationStatus: text("certification_status").notNull().default("PENDING"),
    suspensionCount: integer("suspension_count").notNull().default(0),
    withdrawalReason: text("withdrawal_reason"),
    overallPerformanceJson: text("overall_performance_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const certificates = pgTable(
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
    issuedDate: timestamp("issued_date", { mode: "date" }),
    signatureApprovalStatus: text("signature_approval_status").notNull().default("PENDING"),
    signedByPrincipalId: text("signed_by_principal_id").references(() => users.id, { onDelete: "set null" }),
    signedByPrincipalName: text("signed_by_principal_name"),
    signatureDate: timestamp("signature_date", { mode: "date" }),
    reprintCount: integer("reprint_count").notNull().default(0),
    reprintHistoryJson: text("reprint_history_json").notNull().default("[]"),
    digitalHash: text("digital_hash"),
    qrCode: text("qr_code"),
    isVerifiable: boolean("is_verifiable").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    metaJson: text("meta_json"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    auditSchoolCreatedIdx: index("audit_school_created_idx").on(
      table.schoolId,
      table.createdAt
    ),
  })
);

export const teacherRewardWinners = pgTable(
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
    points: doublePrecision("points").notNull(),
    breakdownJson: text("breakdown_json").notNull().default("{}"),
    finalizedBy: text("finalized_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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
