# API Testing Guide for ReSchool System

This guide walks you through testing the complete workflow of the ReSchool system.

## Prerequisites
- Cloudflare D1 connection established
- JWT_SECRET environment variable set
- School already registered with admin account

## Base URL
```
http://localhost:3000/api
```

## Authentication
All requests (except login) require an Authorization header:
```
Authorization: Bearer <token>
```

---

## Test Workflow

### Step 1: Login as Admin

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@school.com",
  "password": "adminPassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "userId",
    "fullName": "Admin Name",
    "email": "admin@school.com",
    "role": "ADMIN",
    "schoolId": "schoolId"
  }
}
```

**Save the token** for subsequent requests.

---

### Step 2: Create Academic Year

**Endpoint:** `POST /api/academic-years/create`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request:**
```json
{
  "name": "2024/2025 Academic Year",
  "startDate": "2024-09-01",
  "endDate": "2025-07-31",
  "term": 1
}
```

**Response:**
```json
{
  "academicYearId": "academicYearId",
  "message": "Academic year created successfully"
}
```

---

### Step 3: Create Subjects

**Endpoint:** `POST /api/subjects`

**Create Mathematics:**
```json
{
  "name": "Mathematics",
  "code": "MATH"
}
```

**Response:**
```json
{
  "subjectId": "mathSubjectId",
  "message": "Subject created successfully"
}
```

**Create English Language:**
```json
{
  "name": "English Language",
  "code": "ENG"
}
```

**Create Basic Science:**
```json
{
  "name": "Basic Science",
  "code": "SCI"
}
```

**Create more subjects as needed...**

---

### Step 4: Get All Subjects

**Endpoint:** `GET /api/subjects`

**Response:**
```json
{
  "subjects": [
    {
      "_id": "mathSubjectId",
      "name": "Mathematics",
      "code": "MATH"
    },
    {
      "_id": "engSubjectId",
      "name": "English Language",
      "code": "ENG"
    }
  ]
}
```

---

### Step 5: Create Classes

**Endpoint:** `POST /api/classes/create`

**Create JSS 1A:**
```json
{
  "level": "JSS1",
  "arm": "A"
}
```

**Response:**
```json
{
  "classId": "jss1aId"
}
```

**Create JSS 1B, JSS 1C, etc.**

---

### Step 6: Link Subjects to Class

**Endpoint:** `POST /api/classes/link-subjects`

**Request:**
```json
{
  "classId": "jss1aId",
  "subjectIds": [
    "mathSubjectId",
    "engSubjectId",
    "sciSubjectId"
  ]
}
```

**Response:**
```json
{
  "message": "Subjects linked to class successfully",
  "class": { ... }
}
```

---

### Step 7: Create Teacher Account

**Endpoint:** `POST /api/teachers/create`

**Request:**
```json
{
  "fullName": "Mr. John Okafor",
  "email": "john.okafor@school.com",
  "password": "teacher123",
  "classTeacherOf": "jss1aId",
  "subjectsAndClasses": [
    {
      "subjectId": "mathSubjectId",
      "classIds": ["jss1aId", "jss1bId", "jss1cId"]
    }
  ]
}
```

**Response:**
```json
{
  "userId": "teacherId",
  "teacherProfileId": "profileId",
  "message": "Teacher created successfully"
}
```

---

### Step 8: Create Parent Account

**Endpoint:** `POST /api/users/create`

**Request:**
```json
{
  "fullName": "Mrs. Grace Adeola",
  "email": "grace.adeola@email.com",
  "password": "parent123",
  "role": "PARENT"
}
```

**Response:**
```json
{
  "userId": "parentId"
}
```

---

### Step 9: Login as Teacher

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john.okafor@school.com",
  "password": "teacher123"
}
```

**Response:**
```json
{
  "token": "teacher_token...",
  "user": { ... }
}
```

**Save the teacher token.**

---

### Step 10: Create Student (as Class Teacher)

**Endpoint:** `POST /api/students/create`

**Headers:**
```
Authorization: Bearer <teacher_token>
```

**Request:**
```json
{
  "fullName": "Chidi Adeola",
  "parentId": "parentId",
  "classId": "jss1aId"
}
```

**Response:**
```json
{
  "studentId": "studentId",
  "message": "Student created successfully"
}
```

**Note:** This will only work if the teacher is the class teacher of JSS 1A.

---

### Step 11: Get Students in Class

**Endpoint:** `GET /api/students/by-class?classId=jss1aId`

**Response:**
```json
{
  "class": {
    "_id": "jss1aId",
    "level": "JSS1",
    "arm": "A",
    "subjects": [...]
  },
  "students": [
    {
      "_id": "studentId",
      "fullName": "Chidi Adeola",
      "parentId": { ... },
      "currentClassId": "jss1aId"
    }
  ],
  "count": 1
}
```

---

### Step 12: Upload Scores (as Subject Teacher)

**Endpoint:** `POST /api/scores/upload`

**Headers:**
```
Authorization: Bearer <teacher_token>
```

**Request:**
```json
{
  "studentId": "studentId",
  "classId": "jss1aId",
  "subjectId": "mathSubjectId",
  "term": 1,
  "classwork": 8,
  "homework": 9,
  "extracurricular": 7,
  "test": 25,
  "exam": 55
}
```

**Response:**
```json
{
  "scoreId": "scoreId",
  "message": "Score uploaded successfully"
}
```

**Note:** This only works if the teacher teaches Mathematics in JSS 1A.

---

### Step 13: View Scores

**Endpoint:** `GET /api/scores/view?studentId=studentId&term=1`

**Response:**
```json
{
  "scores": [
    {
      "_id": "scoreId",
      "studentId": { ... },
      "classId": { ... },
      "subjectId": {
        "_id": "mathSubjectId",
        "name": "Mathematics",
        "code": "MATH"
      },
      "term": 1,
      "classwork": 8,
      "homework": 9,
      "extracurricular": 7,
      "test": 25,
      "exam": 55,
      "total": 104,
      "teacherId": { ... }
    }
  ]
}
```

---

### Step 14: Login as Parent

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "grace.adeola@email.com",
  "password": "parent123"
}
```

**Save parent token.**

---

### Step 15: View Ward Scores (as Parent)

**Endpoint:** `GET /api/parents/ward-scores`

**Headers:**
```
Authorization: Bearer <parent_token>
```

**Response:**
```json
{
  "students": [
    {
      "_id": "studentId",
      "fullName": "Chidi Adeola",
      "currentClassId": {
        "level": "JSS1",
        "arm": "A"
      }
    }
  ],
  "scores": [
    {
      "subjectId": {
        "name": "Mathematics"
      },
      "classwork": 8,
      "homework": 9,
      "extracurricular": 7,
      "test": 25,
      "exam": 55,
      "total": 104
    }
  ]
}
```

---

## Additional Endpoints

### List All Teachers
**Endpoint:** `GET /api/teachers/list`
**Auth:** Admin only

### List All Classes
**Endpoint:** `GET /api/classes/list`
**Auth:** Any authenticated user

### Get Teacher Profile
**Endpoint:** `GET /api/teachers/create`
**Auth:** Teacher only (gets own profile)

### Update Teacher Assignments
**Endpoint:** `PATCH /api/teachers/assignments`
**Auth:** Admin only
```json
{
  "teacherUserId": "teacherId",
  "classTeacherOf": "newClassId",
  "subjectsAndClasses": [...]
}
```

---

## Permission Test Cases

### Test 1: Non-Class Teacher Cannot Create Students
1. Login as a teacher who is NOT a class teacher of JSS 1A
2. Try to create a student for JSS 1A
3. Should receive: `403 - Only class teachers can create students for their assigned class`

### Test 2: Teacher Cannot Edit Scores for Non-Assigned Subject
1. Login as a teacher who teaches Mathematics but NOT English
2. Try to upload English scores
3. Should receive: `403 - You are not authorized to edit scores for this subject in this class`

### Test 3: Parent Can Only View Own Ward's Scores
1. Login as parent
2. Call `/api/parents/ward-scores`
3. Should only see their own children's scores

---

## Postman Collection

Import this collection into Postman for easy testing:

1. Create a new collection called "ReSchool API"
2. Add an environment with variables:
   - `base_url`: http://localhost:3000/api
   - `admin_token`: (set after admin login)
   - `teacher_token`: (set after teacher login)
   - `parent_token`: (set after parent login)
3. Add requests for each endpoint above
4. Use `{{base_url}}` and `{{admin_token}}` in requests

---

## Troubleshooting

### Error: "No active academic year found"
- Create an academic year first
- Set it as active using `/api/academic-years/set-active`

### Error: "Teacher profile not found"
- Ensure teacher was created using `/api/teachers/create`, not `/api/users/create`
- TeacherProfile is automatically created with teacher user

### Error: "Invalid credentials"
- Check email and password
- Ensure user exists in database

### Error: "Unauthorized"
- Check Authorization header is present
- Verify token is valid and not expired
- Ensure user has correct role for the action

---

## Sample cURL Commands

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password"}'
```

### Create Subject
```bash
curl -X POST http://localhost:3000/api/subjects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mathematics","code":"MATH"}'
```

### Upload Score
```bash
curl -X POST http://localhost:3000/api/scores/upload \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId":"STUDENT_ID",
    "classId":"CLASS_ID",
    "subjectId":"SUBJECT_ID",
    "term":1,
    "classwork":8,
    "homework":9,
    "test":25,
    "exam":55
  }'
```
