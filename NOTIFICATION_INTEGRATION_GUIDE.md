# Notification Integration Guide

## Overview
This guide shows how to integrate the new notification APIs into existing workflows to make the system fully connected.

## Integration Points

### 1. Daily Mark Creation → Notify Parent
**File to Modify:** `app/api/scores/daily-marks/create/route.ts`

**Add Import:**
```typescript
import { notifyMarkUpdate } from "@/app/api/notifications/send/route";
```

**Add After Mark Creation (line ~60):**
```typescript
// After: const dailyMark = await DailyMark.create({...})

// Trigger notification
await notifyMarkUpdate(
  user.schoolId,
  dailyMark.studentId.toString(),
  dailyMark.assessmentType
);
```

---

### 2. Report Card Generation → Notify Parents
**Already Implemented in:** `app/api/reports/generate-term-cards/route.ts`

This is already hooked in:
```typescript
// Notify parent
await notifyReportReady(
  user.schoolId,
  termId,
  student._id.toString(),
  reportCard._id.toString()
);
```

No changes needed ✅

---

### 3. Term Activation → Alert Admins About Payment
**File to Modify:** `app/api/academic-years/set-active/route.ts` (or wherever term is activated)

**Add Import:**
```typescript
import { notifyPaymentDue } from "@/app/api/notifications/send/route";
```

**Add After Term Activation:**
```typescript
// After term is set to active
await notifyPaymentDue(user.schoolId, activeTerm._id.toString(), user.id);
```

---

### 4. Attendance Import → Warn About Low Attendance
**File to Modify:** `app/api/attendance/mark/route.ts`

**Add Import:**
```typescript
import { notifyLowAttendance } from "@/app/api/attendance/dashboard/route";
```

**Add After Calculating Attendance:**
```typescript
// After calculating studentAttendance.attendancePercentage
if (studentAttendance.attendancePercentage < 60) {
  await notifyLowAttendance(
    user.schoolId,
    studentId,
    studentAttendance.attendancePercentage
  );
}
```

---

## Required Database Index

To optimize notification queries, add this index to MongoDB:

```javascript
// Run in MongoDB console
db.notifications.createIndex({
  "recipientId": 1,
  "readAt": 1,
  "sentAt": -1
});

db.notifications.createIndex({
  "schoolId": 1,
  "type": 1,
  "sentAt": -1
});
```

Or in Mongoose (add to Notification model):
```typescript
// In notificationSchema
notificationSchema.index({ recipientId: 1, readAt: 1, sentAt: -1 });
notificationSchema.index({ schoolId: 1, type: 1, sentAt: -1 });
```

---

## Testing Integration

### Manual Test Workflow

1. **Create Daily Mark**
   ```bash
   POST /api/scores/daily-marks/create
   {
     "studentId": "...",
     "termId": "...",
     "assessmentType": "CLASSWORK",
     "score": 85
   }
   ```

2. **Check Parent Got Notification**
   ```bash
   GET /api/notifications/list?unreadOnly=true
   ```
   Response should include:
   ```json
   {
     "id": "...",
     "type": "MARK_UPDATE",
     "title": "New Classwork Mark",
     "message": "A new Classwork mark has been recorded...",
     "isRead": false
   }
   ```

3. **Mark as Read**
   ```bash
   POST /api/notifications/mark-read
   {
     "notificationIds": ["..."]
   }
   ```

4. **Verify No Longer Unread**
   ```bash
   GET /api/notifications/list?unreadOnly=true
   ```
   Notification should be gone.

---

## UI Integration Points

### Admin Dashboard
Add buttons to:
1. **View audit trail** → `GET /api/audit/marks?type=DAILY_MARKS`
2. **Generate report cards** → `POST /api/reports/generate-term-cards`
3. **Export certificates** → `GET /api/export/certificates`

### Parent Dashboard
Add sections for:
1. **Notifications** → `GET /api/notifications/list` (unread count in header)
2. **Download transcript** → `GET /api/export/transcript?studentId=...&format=csv`

### Teacher Dashboard
Add Features for:
1. **Edit mark** → `PUT /api/scores/daily-marks/edit/{markId}`
2. **View attendance** → `GET /api/attendance/dashboard?classId=...&termId=...`
3. **See top 10 teachers** → `GET /api/teachers/leaderboard`

---

## Response Examples

### Notification List Response
```json
{
  "notifications": [
    {
      "id": "507f1f77bcf86cd799439011",
      "type": "MARK_UPDATE",
      "title": "New Mathematics Mark",
      "message": "A new Classwork mark has been recorded for John Doe",
      "actionUrl": "/parent/scores",
      "priority": "NORMAL",
      "isRead": false,
      "sentAt": "2024-12-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  },
  "unreadCount": 5
}
```

### Report Card Generation Response
```json
{
  "message": "Report cards generated for 45 students",
  "termId": "507f1f77bcf86cd799439011",
  "academicYearId": "507f1f77bcf86cd799439012",
  "generatedCount": 45,
  "totalStudents": 50,
  "generatedAt": "2024-12-15T11:00:00.000Z"
}
```

### Attendance Dashboard Response
```json
{
  "class": "507f1f77bcf86cd799439011",
  "term": "507f1f77bcf86cd799439012",
  "dateRange": {
    "from": "2024-12-01",
    "to": "2024-12-15"
  },
  "classStats": {
    "totalStudents": 40,
    "averageAttendance": 87,
    "criticalCount": 2,
    "warningCount": 5,
    "excellentCount": 33
  },
  "studentAttendance": [
    {
      "studentId": "STU001",
      "studentName": "Chioma Okafor",
      "present": 10,
      "absent": 2,
      "late": 1,
      "excused": 0,
      "attendancePercentage": 85,
      "status": "GOOD"
    }
  ]
}
```

---

## Troubleshooting

### Notifications Not Appearing
1. Check `GET /api/notifications/list` endpoint returns data
2. Verify recipientId in database matches logged-in parent's userId
3. Confirm parent.userId (not parent.id) is used in student record

### Report Cards Not Generating
1. Verify students have daily marks in the term
2. Check daily marks have valid examScore in Score model
3. Ensure termId exists and is closed (optional validation)

### Attendance % Calculation Wrong
1. Verify daily marks counted: present vs absent vs late
2. Formula: (present + late) / (present + absent + late + excused) × 100
3. Check AttendanceRecord has proper status values

---

## Performance Tuning

### Cache Leaderboard (Monthly)
```typescript
// In teacher leaderboard route
const cached = await redis.get(`leaderboard:${schoolId}:${currentMonth}`);
if (cached) return cached;

// ... calculate leaderboard ...

await redis.setex(`leaderboard:${schoolId}:${currentMonth}`, 86400, JSON.stringify(leaderboard));
```

### Async Report Generation (>500 students)
```typescript
// Use Bull queue for async job
const reportQueue = new Queue('generate-reports');
reportQueue.add({ termId, academicYearId }, { delay: 5000 });

reportQueue.process(async (job) => {
  // Generate reports in background
});
```

### Paginate Audit Trail
Already implemented with `limit` parameter. Default: 100 records.

---

## Security Checklist

- ✅ All endpoints require JWT authentication
- ✅ School scoping enforced (schoolId in all queries)
- ✅ Role-based access control (ADMIN|TEACHER|PARENT)
- ✅ Parents can only see own ward notifications
- ✅ Teachers can only edit own marks
- ✅ Certificates export restricted to ADMIN only
- ✅ Audit trail restricted to ADMIN only

---

## Deployment Steps

1. **Deploy API routes:** All 10 new routes to production server
2. **Create indices:** Run MongoDB index creation script
3. **Hook integrate:**  Add notification calls to existing routes (4 points above)
4. **UI integration:** Build admin/parent/teacher pages (next phase)
5. **Data migration:** Generate StudentLifecycleRecord for existing students (optional)
6. **Test:** Run integration tests (see Testing Integration section)

---

## Success Metrics

After full integration:
- ✅ Admin can audit all mark changes (who, when, why)
- ✅ Parents receive real-time mark updates
- ✅ Reports can be generated for entire term in <30 seconds
- ✅ Data can be exported to CSV/JSON formats
- ✅ Teacher leaderboard shows monthly top 10 performers
- ✅ Attendance tracked and summarized by class

---

**Last Updated:** December 15, 2024
**Status:** Ready for Integration
