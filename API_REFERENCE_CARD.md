# API Reference Card - Phase 2

## Quick Reference

### Teacher Leaderboard
```bash
GET /api/teachers/leaderboard
Authorization: Bearer {token}

Response:
{
  "period": "12/1/2024 - Today",
  "totalTeachers": 15,
  "weightSystem": {
    "UPLOAD_SCORE": 5,
    "POST_ANNOUNCEMENT": 2,
    "STUDENT_FEEDBACK": 3,
    "MARK_ENTRY": 5,
    "ATTENDANCE_MARK": 1
  },
  "leaderboard": [
    {
      "rank": 1,
      "teacherId": "...",
      "teacherName": "Mrs. Adeyemi",
      "totalPoints": 150,
      "activityCount": 35,
      "averagePointsPerActivity": "4.29",
      "breakdown": { "UPLOAD_SCORE": 100, "STUDENT_FEEDBACK": 50 },
      "badge": "⭐ Excellence"
    }
  ]
}
```

---

### Mark Audit Trail
```bash
GET /api/audit/marks?type=DAILY_MARKS&startDate=2024-12-01&endDate=2024-12-15&limit=100
Authorization: Bearer {token}

Response:
{
  "total": 25,
  "filters": { "type": "DAILY_MARKS", "dateRange": "2024-12-01 to 2024-12-15" },
  "auditTrail": [
    {
      "id": "507f...",
      "type": "DAILY_MARK_MODIFICATION",
      "studentName": "John Doe",
      "assessmentType": "CLASSWORK",
      "field": "score",
      "oldValue": 45,
      "newValue": 50,
      "modifiedBy": "Mrs. Adeyemi",
      "modifiedDate": "2024-12-15T10:30:00Z",
      "reason": "Calculation error in initial entry"
    }
  ]
}
```

---

### Edit Daily Mark
```bash
PUT /api/scores/daily-marks/edit
Content-Type: application/json
Authorization: Bearer {token}

{
  "markId": "507f1f77bcf86cd799439011",
  "newScore": 50,
  "newFeedback": "Excellent work on the problem-solving section",
  "reason": "Correction for calculation error"
}

Response:
{
  "message": "Mark updated successfully",
  "mark": {
    "id": "507f1f77bcf86cd799439011",
    "studentName": "John Doe",
    "assessmentType": "CLASSWORK",
    "oldScore": 45,
    "newScore": 50,
    "feedback": "Excellent work on the problem-solving section",
    "modifiedDate": "2024-12-15T10:30:00Z",
    "totalModifications": 2
  }
}
```

---

### Send Notification
```bash
POST /api/notifications/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "type": "MARK_UPDATE",
  "title": "New Mathematics Mark",
  "message": "A classwork mark has been recorded",
  "recipientIds": ["507f1f77bcf86cd799439011"],
  "actionUrl": "/parent/scores",
  "priority": "NORMAL",
  "channels": ["IN_APP"]
}

Response:
{
  "message": "1 notification(s) sent",
  "notificationCount": 1,
  "type": "MARK_UPDATE",
  "channels": ["IN_APP"]
}
```

---

### List Notifications
```bash
GET /api/notifications/list?unreadOnly=true&type=MARK_UPDATE&page=1&limit=20
Authorization: Bearer {token}

Response:
{
  "notifications": [
    {
      "id": "507f...",
      "type": "MARK_UPDATE",
      "title": "New Mathematics Mark",
      "message": "A new Classwork mark has been recorded for John Doe",
      "actionUrl": "/parent/scores",
      "priority": "NORMAL",
      "isRead": false,
      "sentAt": "2024-12-15T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "pages": 1 },
  "unreadCount": 5
}
```

---

### Mark Notification as Read
```bash
POST /api/notifications/mark-read
Content-Type: application/json
Authorization: Bearer {token}

{
  "notificationIds": ["507f1f77bcf86cd799439011"]
}

Response:
{
  "message": "1 notification(s) marked as read",
  "markedCount": 1
}
```

**Bulk Mark All As Read:**
```json
{
  "markAllAsRead": true
}
```

---

### Generate Report Cards
```bash
POST /api/reports/generate-term-cards
Content-Type: application/json
Authorization: Bearer {token}

{
  "termId": "507f1f77bcf86cd799439011",
  "academicYearId": "507f1f77bcf86cd799439012"
}

Response:
{
  "message": "Report cards generated for 45 students",
  "termId": "507f1f77bcf86cd799439011",
  "academicYearId": "507f1f77bcf86cd799439012",
  "generatedCount": 45,
  "totalStudents": 50,
  "generatedAt": "2024-12-15T11:00:00Z"
}
```

---

### Export Transcript
```bash
GET /api/export/transcript?studentId=507f1f77bcf86cd799439011&format=csv
Authorization: Bearer {token}

Response (CSV):
Student Transcript - John Doe
Student ID: STU001
Generated: 12/15/2024

2024 - Term 1
Subject,Classwork,Homework,Evaluation,Exam,Total,Grade
Mathematics,45,40,35,78,70,B
English Language,50,45,42,72,68,B
Physics,48,42,38,75,69,B
Average Score: 69, Class Rank: 2, Attendance: 95%, Promotion: PROMOTED

2023 - Term 3
Subject,Classwork,Homework,Evaluation,Exam,Total,Grade
...
```

---

### Export Certificates
```bash
GET /api/export/certificates?academicYearId=507f1f77bcf86cd799439012&format=csv
Authorization: Bearer {token}

Response (CSV):
Certificate Number,Student Name,Student ID,Issue Date,Verification Code
CERT-2024-001,"John Doe",STU001,12/15/2024,abc123def456789...
CERT-2024-002,"Chioma Okafor",STU002,12/15/2024,xyz987abc123456...

OR format=json

Response (JSON):
{
  "exportDate": "2024-12-15T11:00:00Z",
  "totalCertificates": 2,
  "format": "json",
  "certificates": [
    {
      "certificateNumber": "CERT-2024-001",
      "studentName": "John Doe",
      "studentId": "STU001",
      "issuedDate": "2024-12-15T10:00:00Z",
      "signedBy": "Principal James Okafor",
      "verificationCode": "abc123def456789",
      "qrCode": "data:image/png;base64,...",
      "isVerifiable": true
    }
  ]
}
```

---

### Attendance Dashboard
```bash
GET /api/attendance/dashboard?classId=507f1f77bcf86cd799439011&termId=507f1f77bcf86cd799439012&startDate=2024-12-01&endDate=2024-12-15
Authorization: Bearer {token}

Response:
{
  "class": "507f1f77bcf86cd799439011",
  "term": "507f1f77bcf86cd799439012",
  "dateRange": { "from": "2024-12-01", "to": "2024-12-15" },
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
      "studentName": "John Doe",
      "present": 10,
      "absent": 2,
      "late": 1,
      "excused": 0,
      "attendancePercentage": 85,
      "status": "GOOD"
    },
    {
      "studentId": "STU050",
      "studentName": "Folake Alabi",
      "present": 5,
      "absent": 7,
      "late": 1,
      "excused": 0,
      "attendancePercentage": 43,
      "status": "CRITICAL"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "markId, newScore, and reason are required"
}
```

### 402 Payment Required
```json
{
  "error": "Term not paid or closed"
}
```

### 403 Unauthorized
```json
{
  "error": "Cannot edit another teacher's marks"
}
```

### 404 Not Found
```json
{
  "error": "Daily mark not found"
}
```

### 500 Server Error
```json
{
  "error": "Failed to update mark"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing/invalid params) |
| 402 | Payment required (term not paid) |
| 403 | Forbidden (no access/wrong role) |
| 404 | Not found (resource doesn't exist) |
| 500 | Server error |

---

## Notification Types

| Type | Trigger | Recipient |
|------|---------|-----------|
| ANNOUNCEMENT | Posted by teacher | All students/parents |
| REPORT_READY | Report cards generated | Parent |
| PAYMENT_DUE | Term activated | Admin |
| ATTENDANCE_WARNING | Low attendance (<60%) | Parent |
| BEHAVIOR_ALERT | Poor comportment | Parent |
| MARK_UPDATE | Daily mark recorded | Parent |
| CERTIFICATE_READY | Cert signed & issued | Student/Parent |

---

## Assessment Types

```
CLASSWORK
HOMEWORK
EVALUATION
EXAM
```

---

## Promotion Status

```
PROMOTED      - >50% avg, teacher approved
DEFERRED      - <50% avg
REPEATED      - Teacher recommendation for repeat
```

---

## Teacher Rewards Badges

```
⭐ Excellence       (>= 100 points)
🌟 High Performer   (>= 50 points)
👍 Active           (>= 20 points)
📊 Participant      (< 20 points)
```

---

## Attendance Status

```
EXCELLENT  - >= 90%
GOOD       - >= 75%
WARNING    - >= 60%
CRITICAL   - < 60%
```

---

**Quick Test Command (cURL):**
```bash
curl -X GET http://localhost:3000/api/teachers/leaderboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated:** December 15, 2024
**API Version:** 1.0
**Status:** Production Ready
