CREATE TABLE "admission_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"prefix" text NOT NULL,
	"year_format" text NOT NULL,
	"number_length" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"announcement_id" text NOT NULL,
	"reader_id" text NOT NULL,
	"read_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"created_by" text NOT NULL,
	"announcement_type" text DEFAULT 'GENERAL' NOT NULL,
	"target_audience" text DEFAULT 'ALL' NOT NULL,
	"class_id" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"created_date" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text,
	"student_id" text NOT NULL,
	"session_id" text NOT NULL,
	"term_id" text NOT NULL,
	"attendance_date" timestamp NOT NULL,
	"status" text NOT NULL,
	"excuse_reason" text,
	"marked_by" text NOT NULL,
	"marked_time" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"meta_json" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"student_name" text NOT NULL,
	"student_admission_number" text NOT NULL,
	"admission_year" integer,
	"graduation_year" integer,
	"class_level" text NOT NULL,
	"certificate_number" text NOT NULL,
	"issued_date" timestamp,
	"signature_approval_status" text DEFAULT 'PENDING' NOT NULL,
	"signed_by_principal_id" text,
	"signed_by_principal_name" text,
	"signature_date" timestamp,
	"reprint_count" integer DEFAULT 0 NOT NULL,
	"reprint_history_json" text DEFAULT '[]' NOT NULL,
	"digital_hash" text,
	"qr_code" text,
	"is_verifiable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_arms" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_marks" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text,
	"teacher_id" text NOT NULL,
	"session_id" text NOT NULL,
	"term_id" text NOT NULL,
	"assessment_type" text NOT NULL,
	"score" double precision NOT NULL,
	"max_score" double precision NOT NULL,
	"weightage" double precision NOT NULL,
	"feedback_notes" text,
	"modification_history_json" text DEFAULT '[]' NOT NULL,
	"recorded_date" timestamp NOT NULL,
	"recorded_by" text NOT NULL,
	"last_modified_by" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text,
	"session_id" text NOT NULL,
	"term_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"recipient_role" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"delivery_channels_json" text DEFAULT '["IN_APP"]' NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"created_date" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_ward_links" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"relationship" text DEFAULT 'GUARDIAN' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"term_id" text NOT NULL,
	"session_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text,
	"class_name" text NOT NULL,
	"term_number" integer NOT NULL,
	"year_label" text NOT NULL,
	"subject_scores_json" text DEFAULT '[]' NOT NULL,
	"total_score" double precision DEFAULT 0 NOT NULL,
	"average_score" double precision DEFAULT 0 NOT NULL,
	"class_ranking" integer,
	"class_size" integer,
	"overall_remark" text,
	"attendance_percentage" double precision,
	"comportment_json" text DEFAULT '{}' NOT NULL,
	"promotion_status" text,
	"repeat_reason" text,
	"generated_date" timestamp NOT NULL,
	"approved_by" text,
	"print_count" integer DEFAULT 0 NOT NULL,
	"print_history_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text,
	"session_id" text NOT NULL,
	"term_id" text NOT NULL,
	"score" double precision NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"logo_url" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"arm_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"year" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_lifecycle_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"admission_date" timestamp,
	"admission_class" text,
	"current_class" text,
	"current_status" text DEFAULT 'ACTIVE' NOT NULL,
	"milestones_json" text DEFAULT '[]' NOT NULL,
	"graduation_date" timestamp,
	"certificate_id" text,
	"certification_status" text DEFAULT 'PENDING' NOT NULL,
	"suspension_count" integer DEFAULT 0 NOT NULL,
	"withdrawal_reason" text,
	"overall_performance_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"admission_number" text NOT NULL,
	"gender" text,
	"date_of_birth" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_class_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"class_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_remarks" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"session_id" text NOT NULL,
	"term_id" text NOT NULL,
	"student_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text,
	"type" text NOT NULL,
	"subject_id" text,
	"academic_performance" text,
	"class_participation" text,
	"attitude_to_duties" text,
	"custom_remark" text,
	"promotion_recommendation" text,
	"remarked_by" text NOT NULL,
	"remarked_date" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_reward_winners" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"term_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"rank" integer NOT NULL,
	"points" double precision NOT NULL,
	"breakdown_json" text DEFAULT '{}' NOT NULL,
	"finalized_by" text NOT NULL,
	"note" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_subject_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"class_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"session_id" text NOT NULL,
	"term_number" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"payment_date" timestamp,
	"payment_reference" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_settings" ADD CONSTRAINT "admission_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_reader_id_users_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_signed_by_principal_id_users_id_fk" FOREIGN KEY ("signed_by_principal_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_marks" ADD CONSTRAINT "daily_marks_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_ward_links" ADD CONSTRAINT "parent_ward_links_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_ward_links" ADD CONSTRAINT "parent_ward_links_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_ward_links" ADD CONSTRAINT "parent_ward_links_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_arm_id_class_arms_id_fk" FOREIGN KEY ("arm_id") REFERENCES "public"."class_arms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_records" ADD CONSTRAINT "student_lifecycle_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_records" ADD CONSTRAINT "student_lifecycle_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_remarks" ADD CONSTRAINT "teacher_remarks_remarked_by_users_id_fk" FOREIGN KEY ("remarked_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reward_winners" ADD CONSTRAINT "teacher_reward_winners_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reward_winners" ADD CONSTRAINT "teacher_reward_winners_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reward_winners" ADD CONSTRAINT "teacher_reward_winners_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reward_winners" ADD CONSTRAINT "teacher_reward_winners_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admission_settings_school_unique" ON "admission_settings" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_reads_unique" ON "announcement_reads" USING btree ("school_id","announcement_id","reader_id");--> statement-breakpoint
CREATE INDEX "announcement_reads_reader_idx" ON "announcement_reads" USING btree ("school_id","reader_id","read_at");--> statement-breakpoint
CREATE INDEX "announcements_school_created_idx" ON "announcements" USING btree ("school_id","created_date");--> statement-breakpoint
CREATE INDEX "announcements_audience_idx" ON "announcements" USING btree ("school_id","target_audience","created_date");--> statement-breakpoint
CREATE INDEX "announcements_class_idx" ON "announcements" USING btree ("school_id","class_id","created_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_unique" ON "attendance_records" USING btree ("school_id","student_id","term_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_class_idx" ON "attendance_records" USING btree ("school_id","class_id","term_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "attendance_records" USING btree ("school_id","student_id","term_id");--> statement-breakpoint
CREATE INDEX "audit_school_created_idx" ON "audit_logs" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_student_unique" ON "certificates" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_number_unique" ON "certificates" USING btree ("school_id","certificate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "class_arms_school_name_unique" ON "class_arms" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "class_arms_school_idx" ON "class_arms" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_subjects_unique" ON "class_subjects" USING btree ("school_id","class_id","subject_id");--> statement-breakpoint
CREATE INDEX "class_subjects_class_idx" ON "class_subjects" USING btree ("school_id","class_id");--> statement-breakpoint
CREATE INDEX "class_subjects_subject_idx" ON "class_subjects" USING btree ("school_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_school_name_unique" ON "classes" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "classes_school_level_idx" ON "classes" USING btree ("school_id","level");--> statement-breakpoint
CREATE INDEX "daily_marks_term_idx" ON "daily_marks" USING btree ("school_id","term_id","class_id","subject_id");--> statement-breakpoint
CREATE INDEX "daily_marks_student_idx" ON "daily_marks" USING btree ("school_id","student_id","term_id");--> statement-breakpoint
CREATE INDEX "daily_marks_teacher_idx" ON "daily_marks" USING btree ("school_id","teacher_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_unique" ON "enrollments" USING btree ("student_id","section_id","session_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_legacy_unique" ON "enrollments" USING btree ("student_id","class_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_session_term_idx" ON "enrollments" USING btree ("school_id","student_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "enrollments_section_idx" ON "enrollments" USING btree ("school_id","section_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("school_id","recipient_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("school_id","type","created_date");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_ward_links_unique" ON "parent_ward_links" USING btree ("school_id","parent_id","student_id");--> statement-breakpoint
CREATE INDEX "parent_ward_links_parent_idx" ON "parent_ward_links" USING btree ("school_id","parent_id");--> statement-breakpoint
CREATE INDEX "parent_ward_links_student_idx" ON "parent_ward_links" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_cards_unique" ON "report_cards" USING btree ("school_id","student_id","term_id");--> statement-breakpoint
CREATE INDEX "report_cards_class_idx" ON "report_cards" USING btree ("school_id","class_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_unique" ON "results" USING btree ("student_id","subject_id","section_id","session_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_legacy_unique" ON "results" USING btree ("student_id","subject_id","class_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "results_student_idx" ON "results" USING btree ("school_id","student_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "results_class_idx" ON "results" USING btree ("school_id","class_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "results_subject_idx" ON "results" USING btree ("school_id","subject_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "results_section_idx" ON "results" USING btree ("school_id","section_id","session_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_school_class_arm_unique" ON "sections" USING btree ("school_id","class_id","arm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_school_name_unique" ON "sections" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "sections_school_idx" ON "sections" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "sections_class_idx" ON "sections" USING btree ("school_id","class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_school_year_unique" ON "sessions" USING btree ("school_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_current_per_school_unique" ON "sessions" USING btree ("school_id") WHERE "sessions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "sessions_school_current_idx" ON "sessions" USING btree ("school_id","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "student_lifecycle_unique" ON "student_lifecycle_records" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE INDEX "student_lifecycle_status_idx" ON "student_lifecycle_records" USING btree ("school_id","current_status");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_admission_unique" ON "students" USING btree ("school_id","admission_number");--> statement-breakpoint
CREATE INDEX "students_school_admission_idx" ON "students" USING btree ("school_id","admission_number");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_school_name_unique" ON "subjects" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_class_teacher_unique" ON "teacher_class_assignments" USING btree ("school_id","teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_class_class_unique" ON "teacher_class_assignments" USING btree ("school_id","class_id");--> statement-breakpoint
CREATE INDEX "teacher_class_assignments_teacher_idx" ON "teacher_class_assignments" USING btree ("school_id","teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_remarks_idx" ON "teacher_remarks" USING btree ("school_id","student_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_remarks_unique" ON "teacher_remarks" USING btree ("school_id","student_id","term_id","type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_reward_term_teacher_unique" ON "teacher_reward_winners" USING btree ("school_id","term_id","teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_reward_term_rank_unique" ON "teacher_reward_winners" USING btree ("school_id","term_id","rank");--> statement-breakpoint
CREATE INDEX "teacher_reward_term_idx" ON "teacher_reward_winners" USING btree ("school_id","term_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_subject_assignments_unique" ON "teacher_subject_assignments" USING btree ("school_id","teacher_id","subject_id","class_id");--> statement-breakpoint
CREATE INDEX "teacher_subject_assignments_teacher_idx" ON "teacher_subject_assignments" USING btree ("school_id","teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_subject_assignments_class_idx" ON "teacher_subject_assignments" USING btree ("school_id","class_id");--> statement-breakpoint
CREATE INDEX "teacher_subject_assignments_subject_idx" ON "teacher_subject_assignments" USING btree ("school_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_session_name_unique" ON "terms" USING btree ("session_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_session_number_unique" ON "terms" USING btree ("session_id","term_number");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_current_per_session_unique" ON "terms" USING btree ("session_id") WHERE "terms"."is_current" = true;--> statement-breakpoint
CREATE INDEX "terms_school_session_current_idx" ON "terms" USING btree ("school_id","session_id","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "users_school_email_unique" ON "users" USING btree ("school_id","email");--> statement-breakpoint
CREATE INDEX "users_school_idx" ON "users" USING btree ("school_id");