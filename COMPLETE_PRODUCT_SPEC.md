# ReSchool Complete Product Specification

**Version:** 1.0 (Master Edition)  
**Date:** February 16, 2026  
**Target:** Enterprise‑grade Nigerian school management system

---

## I. Student Lifecycle & Records

### 1.1 Longitudinal Student Record (LSR)
**Purpose:** Single-source-of-truth view of a student from admission to graduation.

**Data Model: `StudentLifecycleRecord`**
```typescript
{
  schoolId: ObjectId,
  studentId: ObjectId,
  admissionDate: Date,
  admissionClass: String (e.g., "JSS1 A"),
  currentClass: String,
  currentStatus: "ACTIVE" | "SUSPENDED" | "WITHDRAWN" | "GRADUATED" | "DEFERRED",
  
  // Lifecycle milestones
  milestones: [
    {
      academicYear: String,
      term: Number,
      classLevel: String,
      classArm: String,
      termAverage: Number,
      promoted: Boolean,
      action: "PROMOTED" | "REPEATED" | "GRADUATED" | "WITHDRAWN"
    }
  ],
  
  // Certificate/Graduation
  graduationDate: Date,
  certificateId: String (unique),
  certificationStatus: "ELIGIBLE" | "PENDING" | "ISSUED" | "REPRINTING",
  
  // Behavioral & Academic overall
  suspensionCount: Number,
  withdrawalReason: String,
  
  // Aggregates for dashboards
  overallPerformance: {
    bestSubject: String,
    worstSubject: String,
    consistencyScore: Number (0-100, based on term-to-term stability)
  }
}
```

**Key APIs:**
- `GET /api/students/{id}/transcript` - Full academic history
- `GET /api/students/{id}/lifecycle-record` - Milestones + status + performance
- `GET /api/students/{id}/certificate-status` - Graduation eligibility & certificate state

---

### 1.2 Certificate & Graduation Workflow

**Data Model: `Certificate`**
```typescript
{
  schoolId: ObjectId,
  studentId: ObjectId,
  studentName: String,
  studentAdmissionNumber: String,
  admissionYear: Number,
  graduationYear: Number,
  classLevel: String (e.g., "SSS3"),
  
  // Certification details
  certificateNumber: String (unique, format: SCHOOL-YEAR-SEQ),
  issuedDate: Date,
  signatureApprovalStatus: "PENDING" | "APPROVED" | "SIGNED",
  signedBy: {
    principalId: ObjectId,
    principalName: String,
    signatureDate: Date
  },
  
  // Reprint tracking
  reprintCount: Number,
  reprintHistory: [{ reprintDate: Date, reason: String }],
  
  // Digital signature (blockchain-ready future)
  digitalHash: String,
  qrCode: String,
  isVerifiable: Boolean
}
```

**Admin Panel:**
- Bulk certificate generation at end of term
- Signature workflow (principal approval)
- Certificate reprint management
- QR code verification (read-only for parents)

**Parent Portal:**
- View certificate status
- Download certificate (API endpoint for PDF generation)
- Share certificate verification link

---

### 1.3 Student Suspension & Withdrawal Management

**New fields in `Student` model:**
```typescript
{
  ...existing,
  suspensionHistory: [
    {
      suspendedDate: Date,
      suspendedUntilDate: Date,
      reason: String,
      suspendedBy: ObjectId (admin)
    }
  ],
  withdrawalRecord: {
    withdrawnDate: Date,
    reason: String,
    academicStanding: String,
    withdrawnBy: ObjectId
  }
}
```

---

## II. Current Term Activity (In-Period Marking)

### 2.1 Unified Assessment Framework

**Problem:** Daily marks lack term/payment context; exams missing from daily view.

**Solution:** Restructure daily marks + embed in term payment gate.

**Data Model: `DailyMark` (REVISED)**
```typescript
{
  schoolId: ObjectId,
  studentId: ObjectId,
  subjectId: ObjectId,
  classId: ObjectId,
  teacherId: ObjectId,
  academicYearId: ObjectId,
  termId: ObjectId,  // ← NEW: Now term-aware
  
  assessmentType: "CLASSWORK" | "HOMEWORK" | "EVALUATION" | "EXAM",  // ← Generalized
  
  // Score details
  score: Number (0-100),
  maxScore: Number (default 10, but exam defaults to 60),
  weightage: Number (e.g., classwork=10, exam=60 in final),  // ← NEW
  
  // Meta
  recordedDate: Date,
  feedbackNotes: String,
  
  // Audit trail
  recordedBy: ObjectId,
  lastModifiedBy: ObjectId,
  modificationHistory: [
    { modifiedDate: Date, oldScore: Number, newScore: Number, modifiedBy: ObjectId }
  ]
}
```

**Payment Guard (UPDATED):**
- Daily marks creation now enforced with `checkTermAccess(termId)`
- Returns 402 if term unpaid

**Key APIs:**
- `POST /api/scores/daily-marks/create` - Now requires `termId`, validates payment
- `GET /api/scores/daily-marks/list` - Filter by term + type
- `PUT /api/scores/daily-marks/{id}` - Edit + audit trail
- `DELETE /api/scores/daily-marks/{id}` - Soft delete (track in history)

---

### 2.2 Term Report Card Generation

**Data Model: `ReportCard` (NEW)**
```typescript
{
  schoolId: ObjectId,
  studentId: ObjectId,
  termId: ObjectId,
  academicYearId: ObjectId,
  className: String,
  term: Number,
  year: Number,
  
  // Comprehensive scores
  subjectScores: [
    {
      subjectId: ObjectId,
      subjectName: String,
      classwork: Number,
      homework: Number,
      evaluation: Number,
      exam: Number,
      total: Number,
      grade: String (A-F),
      teacherRemark: String,
      subjectTeacherId: ObjectId
    }
  ],
  
  // Totals & rankings
  totalScore: Number,
  averageScore: Number,
  classRanking: Number,
  classSize: Number,
  
  // Behavioral & attitude
  overallRemark: String (from class teacher),
  attendancePercentage: Number,
  comportment: {
    punctuality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
    honesty: "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
    obedience: "EXCELLENT" | "GOOD" | "FAIR" | "POOR"
  },
  
  // Promotion decision
  promotionStatus: "PROMOTED" | "DEFERRED" | "REPEATED",
  repeatReason: String,
  
  // Sign-off
  generatedDate: Date,
  approvedBy: ObjectId (admin),
  printCount: Number,
  printHistory: [{ printDate: Date, printedBy: ObjectId }]
}
```

**Report Card APIs:**
- `POST /api/reports/generate-term-cards` - Admin bulk generation after term close
- `GET /api/reports/report-card/{studentId}/{termId}` - Parent/teacher/admin view
- `GET /api/reports/report-card/{studentId}/{termId}?format=pdf` - PDF download
- `PUT /api/reports/report-card/{id}/approve` - Admin approval before issue

---

## III. Attendance Module

### 3.1 Daily Attendance Tracking

**Data Model: `AttendanceRecord`**
```typescript
{
  schoolId: ObjectId,
  classId: ObjectId,
  academicYearId: ObjectId,
  termId: ObjectId,
  attendanceDate: Date,
  
  records: [
    {
      studentId: ObjectId,
      status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
      excuseReason: String,
      markedBy: ObjectId (teacher),
      markedTime: DateTime
    }
  ],
  
  markedDate: Date,
  total: Number
}
```

**Key APIs:**
- `POST /api/attendance/mark` - Teachers mark daily attendance
- `GET /api/attendance/student-summary/{studentId}/{termId}` - Term attendance %
- `GET /api/attendance/class-summary/{classId}/{termId}` - Class-wide stats
- `PUT /api/attendance/{recordId}` - Correct or excuse absence (admin/teacher)

**Attendance Validation:**
- Warn if student > 10% absent in term
- Flag for parent notification if absent 3+ consecutive days
- Include in report card (term attendance %)

---

## IV. Teacher Remarks & Behavioral Notes

### 4.1 Subject-Level & Overall Remarks

**Data Model: `TeacherRemark`**
```typescript
{
  schoolId: ObjectId,
  academicYearId: ObjectId,
  termId: ObjectId,
  studentId: ObjectId,
  classId: ObjectId,
  
  type: "SUBJECT" | "CLASS_TEACHER",
  subjectId: ObjectId,  // null if CLASS_TEACHER
  
  // Predefined options + custom
  academicPerformance: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR",
  classParticipation: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR",
  attitudeToDuties: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR",
  
  // Custom narrative
  customRemark: String (max 500 chars),
  
  remarkedBy: ObjectId (teacher),
  remarkedDate: Date,
  
  // For class teacher (overall)
  promotionRecommendation: "PROMOTE" | "DEFER" | "REPEAT" | "PENDING"
}
```

**APIs:**
- `POST /api/remarks/create` - Teacher records remark
- `GET /api/remarks/student/{studentId}/{termId}` - All remarks for student
- `PUT /api/remarks/{id}` - Edit remark (before term close)
- `GET /api/remarks/report-data/{studentId}/{termId}` - For report card generation

---

## V. Mark Audit Trail

### 5.1 Immutable Modification History

**Track in `DailyMark.modificationHistory`:**
```typescript
[
  {
    modifiedDate: DateTime,
    oldScore: Number,
    newScore: Number,
    modifiedBy: ObjectId (user),
    modifiedByRole: String (TEACHER | ADMIN),
    reason: String (optional),
    ipAddress: String
  }
]
```

**Also in `Score` model:**
```typescript
{
  ...existing,
  modificationHistory: [
    {
      modifiedDate: DateTime,
      field: String (e.g., "classwork"),
      oldValue: Number,
      newValue: Number,
      modifiedBy: ObjectId,
      reason: String
    }
  ]
}
```

**Audit APIs:**
- `GET /api/audit/marks/{studentId}` - All mark changes for student
- `GET /api/audit/marks?classId=X&from=DATE&to=DATE` - Class mark audit
- `GET /api/audit/marks?modifiedBy=TEACHERID` - Teacher activity audit

**Admin Dashboard:**
- View audit logs filtered by student/teacher/date
- Flag suspicious patterns (bulk retroactive edits)
- Export audit trail (compliance)

---

## VI. Parent/Student Notifications

### 6.1 Multi-Channel Alert System

**Data Model: `Notification` (NEW)**
```typescript
{
  schoolId: ObjectId,
  recipientId: ObjectId (parent or student),
  recipientRole: "PARENT" | "STUDENT",
  
  type: "ANNOUNCEMENT" | "REPORT_READY" | "PAYMENT_DUE" | "ATTENDANCE_WARNING" | "BEHAVIOR_ALERT" | "MARK_UPDATE",
  
  title: String,
  message: String,
  actionUrl: String (link to relevant page),
  
  // Delivery tracking
  deliveryChannels: ["IN_APP", "EMAIL", "SMS"],  // Future: SMS integration
  deliveredAt: DateTime,
  readAt: DateTime,
  
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT",
  createdDate: DateTime
}
```

**Key Triggers:**
- Report card ready → auto‑notify parents
- Term payment due → auto‑notify admins + warning notifications
- Announcement posted → auto‑notify target audience
- Attendance below 80% → end of week warning
- Mark updated → instant notification
- Certificate issued → congratulations notification

**APIs:**
- `GET /api/notifications` - User's notification inbox
- `POST /api/notifications/{id}/mark-read` - Mark as read
- `DELETE /api/notifications/{id}` - Archive
- `GET /api/notifications/preferences` - Configure delivery channels (future)

---

## VII. Data Export & Reporting

### 7.1 Multi-Format Export

**Export Endpoints:**
- `GET /api/export/transcript/{studentId}?format=pdf` - Student full transcript (PDF)
- `GET /api/export/class-ranking/{classId}/{termId}?format=csv` - Class rankings (CSV)
- `GET /api/export/attendance/{classId}/{termId}?format=csv` - Attendance sheet
- `GET /api/export/audit-trail?from=DATE&to=DATE&format=csv` - Compliance audit (CSV)
- `GET /api/export/report-cards?classId=X&termId=Y&format=pdf` - Bulk report cards (ZIP of PDFs)

**Technologies:**
- PDF generation: `pdfkit` or `puppeteer`
- CSV generation: built-in; defer to streaming for large datasets
- ZIP packaging: `adm-zip` or `zip-dir`

---

## VIII. Bug Fixes & Consistency

### 8.1 Daily Marks Term Payment Gating
- Add `termId` to DailyMark schema
- Enforce `checkTermAccess(termId)` in create/edit routes
- Return 402 if term unpaid or closed

### 8.2 AI Guidance Counselor
- Fix subject ID lookup (currently hardcoded strings)
- Add SSS3 track (Science, Art, Commercial)
- Create parent-facing "Guidance" page
- Generate recommendation only once per student per stage

### 8.3 Teacher Rewards System
- Weighted activity scoring (score upload=5pts, announcement=2pts, etc.)
- Time-window filtering (current term only)
- Top 10 leaderboard + rewarding mechanic (badges/recognition)
- Anti-gaming: cap activity per teacher per day

### 8.4 Data Model Fixes
- Fix `StudentClassHistory.studentId` to reference `Student` not `User`
- Add `termId` to all assessment-related models
- Add payment gate to all "current term" operations

---

## IX. User Flows & Pages

### Admin Panel
1. **Dashboard:** Active term status, payment, pending actions, quick stats
2. **Student Management:** Create, update, suspend, withdraw, view transcript
3. **Academic Years & Terms:** Create, activate, mark paid, close, certificate issuance
4. **Teacher Rewards:** Leaderboard, recognition, top-10 badges
5. **Reports & Audit:** Mark audit trail, attendance tracking, data export
6. **Notifications:** View sent announcements, delivery status

### Teacher Portal
1. **Dashboard:** My classes, attendance status, mark upload status, announcements posted
2. **Mark Entry:** Daily marks + term final scores with payment gate
3. **Announcements:** Post class-specific announcements
4. **Reports:** Class performance, individual student profiles
5. **Remarks:** Record subject + behavioral remarks per student per term

### Parent Portal
1. **Dashboard:** Ward overview, active term status, pending notifications
2. **Transcript:** Full student lifecycle record (admission to present)
3. **Reports:** Current term report card + historical
4. **Certificates:** View & download graduation certificates
5. **Announcements:** Inbox + mark-read
6. **Notifications:** All alerts + preferences (future)

### Student Portal (Lite, Optional)
1. **My Record:** View own academic profile (read-only)
2. **Announcements:** Receive school-wide messages
3. **Reports:** View own term report card (if parent approves)

---

## X. Subscription Plans & Feature Gating

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| Basic mark entry | ✓ | ✓ | ✓ |
| Announcements | ✓ | ✓ | ✓ |
| Attendance | ✗ | ✓ | ✓ |
| Reports & Transcripts | ✓ | ✓ | ✓ |
| Certificates | ✓ | ✓ | ✓ |
| Teacher Remarks | ✗ | ✓ | ✓ |
| AI Guidance | ✗ | ✗ | ✓ |
| Audit Trail | ✗ | ✓ | ✓ |
| Data Export (CSV/PDF) | ✗ | ✓ | ✓ |
| Notifications (multi-channel) | ✗ | ✗ | ✓ |

---

## XI. Scalability & Security

- **Payment Gate:** Termsbecome inaccessible 24h after close (read-only access after)
- **Mark Locking:** After term close, scores read-only; only admin can unlock (with audit trail)
- **Backup & Recovery:** Daily DB snapshots; versioning enabled
- **Data Privacy:** Encryption at rest; role-based field masking (parents see only their wards)
- **Compliance:** GDPR-light; audit trails for all mark modifications; consent tracking for parent notifications

---

## XII. Phased Rollout

**Phase 1 (v1.0 - Core):** Lifecycle, certificates, daily marks (term-gated), basic remarks
**Phase 2 (v1.1):** Attendance, report cards, AI guidance, audit trail
**Phase 3 (v1.2):** Notifications, data export, advanced reporting (dashboards)
**Phase 4 (v1.3+):** SMS/email notification channels, mobile apps, integration APIs

---

**End of Spec**
