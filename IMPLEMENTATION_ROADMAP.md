# ReSchool Implementation Roadmap - Remaining APIs

## APIs Completed
✅ Student Lifecycle Record - GET
✅ Student Transcript - GET
✅ Certificate Status - GET/POST
✅ Certificate Management - GET/PATCH (admin approval)
✅ Certificate Signing - POST (admin sign & issue)
✅ Attendance Marking - POST (teacher marks)
✅ Attendance Summary - GET (student term attendance)
✅ Teacher Remarks - POST (create/update)
✅ Teacher Remarks - GET (retrieve for term)

## Critical APIs Still Needed (PRIORITY)

### 1. Daily Marks Payment Gating (FIX)
- **File:** `app/api/scores/daily-marks/create/route.ts`
- **Change:** Add `termId` parameter + `checkTermAccess(termId)` call
- **Status:** CRITICAL - Currently lacks term payment gate

### 2. Mark Audit Trail (FIX)
- **File:** `app/api/scores/daily-marks/{id}/route.ts` (PUT)
- **Feature:** Track all modifications in `modificationHistory` array
- **Status:** CRITICAL - Data governance requirement

### 3. AI Guidance Counselor (FIX + COMPLETE)
- **Files:**
  - `app/api/ai/jss3-recommendation/route.ts` (REPAIR - fix subject ID lookup)
  - `app/api/ai/sss3-recommendation/route.ts` (NEW - for SSS3)
  - `app/api/ai/guidance-results/[studentId]/route.ts` (NEW - get results)
- **Status:** CRITICAL - Currently hardcoded subject strings

### 4. Teacher Rewards System (UPGRADE)
- **Files:**
  - `app/api/teachers/leaderboard/route.ts` (UPGRADE - add weighting)
  - `app/api/teachers/leaderboard/top-10/route.ts` (NEW - top 10 with badges)
  - `app/api/teachers/activity-summary/route.ts` (NEW - personal stats)
- **Weights:**
  - UPLOAD_SCORE = 5 points
  - POST_ANNOUNCEMENT = 2 points
  - STUDENT_FEEDBACK = 3 points
  - PERFECTION (0 errors) = 10 bonus points/month
- **Status:** HIGH - Needs anti-gaming + time window

### 5. Report Card Generation (NEW)
- **File:** `app/api/reports/generate-term-cards/route.ts` (POST)
- **Logic:**
  1. Get all students in term
  2. Aggregate daily marks → subject scores
  3. Fetch teacher remarks
  4. Fetch attendance %
  5. Calculate rank
  6. Determine promotion
  7. Create ReportCard records
- **Status:** HIGH - Blocks parent dashboards

### 6. Notifications System (NEW)
- **Files:**
  - `app/api/notifications/send/route.ts` (POST)
  - `app/api/notifications/list/route.ts` (GET)
  - `app/api/notifications/{id}/mark-read/route.ts` (POST)
- **Triggers:**
  - Report ready → notify parents
  - Term unpaid → notify admin + warning
  - Announcement posted → notify targets
  - Attendance low → end-of-week alert
  - Mark updated → instant notify
- **Status:** MEDIUM - Nice-to-have but valuable

### 7. Data Export (NEW)
- **Files:**
  - `app/api/export/transcript/[studentId]/route.ts` (PDF)
  - `app/api/export/report-cards/bulk/route.ts` (ZIP of PDFs)
  - `app/api/export/class-ranking/[classId]/route.ts` (CSV)
  - `app/api/export/attendance/[classId]/route.ts` (CSV)
  - `app/api/export/audit-trail/route.ts` (CSV)
- **Status:** MEDIUM - Compliance + usability

### 8. Audit Trail APIs (NEW)
- **Files:**
  - `app/api/audit/marks/[studentId]/route.ts` (GET)
  - `app/api/audit/marks/class/[classId]/route.ts` (GET)
  - `app/api/audit/marks/teacher/[teacherId]/route.ts` (GET)
- **Status:** HIGH - Compliance + admin oversight

---

## UI Pages Needed (PRIORITY)

### Admin
1. ✅ Dashboard (exists)
2. ✅ Student management (exists)
3. **Certificate Management** - List pending certs, approve, sign, issue
4. **Attendance Dashboard** - Class-wide attendance trends
5. **Mark Audit Trail** - View all modifications by date/teacher
6. **Teacher Rewards** - Leaderboard + badge management
7. **Notifications** - View sent + delivery status
8. **Data Export** - Bulk export options

### Teacher
1. ✅ Scores upload (exists)
2. **Record Remarks** - Popup form for subject + class teacher remarks
3. **Attendance Marking** - Calendar view with daily mark interface
4. **Class Performance** - Attendance summary, top/bottom students
5. **Activity Dashboard** - My activity points, leaderboard rank

### Parent
1. ✅ Ward dashboard (exists)
2. **Student Transcript** - Full lifecycle + all terms
3. **Report Card** - Current term + historical
4. **Certificates** - Download issued certificates
5. **Attendance Summary** - Term attendance % per ward
6. **Notifications** - Inbox + mark read

---

## Bugs to Fix (IMMEDIATE)

1. **StudentClassHistory.studentId** - Was "User", fixed to "Student" ✅
2. **DailyMark term payment** - Needs `checkTermAccess(termId)` guard
3. **AI Guidance** - Hardcoded subject strings → ID lookup
4. **Class Ranking** - Uses `parent.id` instead of `parent.userId`
5. **Score model** - Add `modificationHistory` for audit ✅

---

## Database Indices (VERIFY)

All new models have proper indices for:
- `schoolId + primary key` (access control)
- `schoolId + termId + key` (term filtering)
- `createdAt` or `date` (sorting)

Model indices added in this build:
- ✅ StudentLifecycleRecord
- ✅ Certificate
- ✅ ReportCard
- ✅ AttendanceRecord
- ✅ TeacherRemark
- ✅ Notification
- Updated: DailyMark, Score, StudentClassHistory, Student

---

## Implementation Order (RECOMMENDED)

**Phase 1 (Critical - Do NOW):**
1. Fix daily marks term payment gating
2. Repair AI guidance (subject ID lookup)
3. Implement mark audit trail APIs
4. Generate report cards API

**Phase 2 (High Priority):**
1. Upgrade teacher rewards
2. Implement notifications system
3. Build mark audit trail UI (admin)
4. Build certificate management UI (admin)

**Phase 3 (Medium Priority):**
1. Implement data export
2. Build remaining UI pages
3. Add attendance dashboard
4. Complete parent transcript view

---

## Testing Checklist

- [ ] Create student → lifecycle record auto-created
- [ ] Mark daily marks without payment → 402 error
- [ ] Pay term → mark daily marks → success
- [ ] Generate report card → all subjects included
- [ ] AI guidance JSS3 → correct recommendation
- [ ] Teacher scores points → visible in leaderboard
- [ ] Issue certificate → QR code valid
- [ ] Download transcript PDF → includes all terms
- [ ] Notification sent → parent receives in-app alert
- [ ] Export CSV → properly formatted data
