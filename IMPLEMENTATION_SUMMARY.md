# ReSchool System Implementation - Changes Summary

## New Models Created

### 1. Subject Model (`app/models/Subject.ts`)
- Tracks subjects like Mathematics, English Language, Basic Science, etc.
- Fields: `schoolId`, `name`, `code`
- Ensures unique subject names per school

### 2. TeacherProfile Model (`app/models/TeacherProfile.ts`)
- Tracks teacher assignments and permissions
- Fields:
  - `userId`: Reference to User account
  - `classTeacherOf`: Class they are class teacher of (optional)
  - `subjectsAndClasses`: Array of subjects and classes they teach
- Links teachers to their teaching responsibilities

## Updated Models

### 1. Class Model (`app/models/Class.ts`)
**Added:**
- `subjectIds`: Array of subjects taught in this class

### 2. Score Model (`app/models/Score.ts`)
**Changed:**
- `subject`: Changed from String to `subjectId` (ObjectId reference)
**Added:**
- `homework`: Score field (0-10 marks)
- `extracurricular`: Score field (0-10 marks)
- Score validation with min/max values
- Auto-calculation of total score
- Unique index to prevent duplicate scores

### 3. Auth Utils (`app/utils/auth.ts`)
**Changed:**
- Token payload field from `id` to `userId` for consistency

## New API Routes

### Subject Management
1. **`POST /api/subjects`** - Create a new subject (Admin only)
2. **`GET /api/subjects`** - List all subjects for the school

### Class-Subject Linking
3. **`POST /api/classes/link-subjects`** - Link subjects to a class (Admin only)
4. **`GET /api/classes/list`** - List all classes with populated data

### Teacher Management
5. **`POST /api/teachers/create`** - Create teacher with assignments (Admin only)
   - Assigns class teacher role
   - Links subjects and classes they teach
6. **`GET /api/teachers/create`** - Get current teacher's profile
7. **`PATCH /api/teachers/assignments`** - Update teacher assignments (Admin only)
8. **`GET /api/teachers/assignments`** - Get specific teacher profile (Admin only)
9. **`GET /api/teachers/list`** - List all teachers with profiles (Admin only)

### Student Management
10. **`GET /api/students/by-class`** - Get all students in a class

### Score Management
11. **`GET /api/scores/view`** - View scores with filters (all authenticated users)

## Updated API Routes

### 1. Student Creation (`app/api/students/create/route.ts`)
**Enhanced Permissions:**
- Admin can create students for any class
- Class teachers can ONLY create students for their assigned class
- Other teachers cannot create students
- Added validation to check TeacherProfile

### 2. Score Upload (`app/api/scores/upload/route.ts`)
**Enhanced Permissions:**
- Verifies teacher teaches the specific subject in the specific class
- Only authorized teachers can edit scores
- Added support for homework and extracurricular scores
- Now uses `subjectId` instead of subject string
- Auto-fetches active academic year
- Uses upsert to update existing scores

### 3. Parent Ward Scores (`app/api/parents/ward-scores/route.ts`)
**Improvements:**
- Fixed userId reference
- Added population of subject and class details
- Added sorting by term
- Better error handling

### 4. Login Route (`app/api/auth/login/route.ts`)
**Fixed:**
- Token payload now uses `userId` instead of `id`

## New Utility Functions

### Teacher Permissions (`app/utils/teacherPermissions.ts`)
Helper functions for permission checks:
- `isClassTeacher()` - Check if teacher is class teacher of a class
- `teachesSubjectInClass()` - Check if teacher teaches subject in class
- `getTeacherClasses()` - Get all classes a teacher is involved with
- `getTeacherSubjects()` - Get all subjects a teacher teaches

## Key Permission Implementation

### Student Creation
```
IF user is ADMIN:
  ✓ Can create students for any class
ELSE IF user is TEACHER:
  - Query TeacherProfile
  - Check if teacher is class teacher of the specified class
  - IF yes: ✓ Allow creation
  - IF no: ✗ Deny with error "Only class teachers can create students"
ELSE:
  ✗ Deny
```

### Score Upload/Edit
```
IF user is TEACHER:
  - Query TeacherProfile
  - Check if teacher teaches this specific subject in this specific class
  - IF yes: ✓ Allow edit
  - IF no: ✗ Deny with error "Not authorized for this subject/class"
ELSE:
  ✗ Deny
```

### Score Viewing
```
IF user is PARENT:
  - Show only their ward's scores
ELSE IF user is TEACHER or ADMIN:
  - Show all scores (with optional filters)
```

## Score Breakdown (Nigerian System)

| Component | Max Marks |
|-----------|-----------|
| Classwork | 10 |
| Homework | 10 |
| Extracurricular | 10 |
| Test | 30 |
| Exam | 60 |
| **TOTAL** | **100** |

## Workflow Summary

1. **Admin Setup:**
   - Create academic year/term
   - Create subjects
   - Create classes
   - Link subjects to classes
   - Create teachers with assignments
   - Create parent accounts

2. **Teacher Actions:**
   - Class teachers create student records for their class
   - Subject teachers enter scores for subjects they teach in classes they're assigned to

3. **Parent Access:**
   - View their ward's information and scores
   - Read-only access

4. **Data Flow:**
   ```
   School → Academic Year → Classes → Students
                          ↓
                       Subjects
                          ↓
   Teachers → Assignments → Scores
   ```

## Database Relationships

```
School
  ├── Users (Admin, Teachers, Parents)
  ├── Classes
  │     └── Subjects (via subjectIds)
  ├── Students
  │     └── Parent (via parentId)
  │     └── Class (via currentClassId)
  ├── TeacherProfiles
  │     └── User (via userId)
  │     └── Class (via classTeacherOf)
  │     └── Subjects & Classes (via subjectsAndClasses)
  └── Scores
        └── Student
        └── Class
        └── Subject
        └── Teacher
        └── AcademicYear
```

## Testing the System

### 1. Create Test Data
```javascript
// 1. Create subjects
POST /api/subjects
{ "name": "Mathematics", "code": "MATH" }
{ "name": "English Language", "code": "ENG" }

// 2. Create class
POST /api/classes/create
{ "level": "JSS1", "arm": "A" }

// 3. Link subjects to class
POST /api/classes/link-subjects
{ "classId": "<classId>", "subjectIds": ["<mathId>", "<engId>"] }

// 4. Create teacher
POST /api/teachers/create
{
  "fullName": "John Doe",
  "email": "john@school.com",
  "password": "password123",
  "classTeacherOf": "<classId>",
  "subjectsAndClasses": [
    {
      "subjectId": "<mathId>",
      "classIds": ["<classId>"]
    }
  ]
}

// 5. Create student (as class teacher)
POST /api/students/create
{ "fullName": "Student Name", "classId": "<classId>" }

// 6. Upload scores (as subject teacher)
POST /api/scores/upload
{
  "studentId": "<studentId>",
  "classId": "<classId>",
  "subjectId": "<mathId>",
  "term": 1,
  "classwork": 8,
  "homework": 9,
  "extracurricular": 7,
  "test": 25,
  "exam": 55
}
```

## Environment Variables Required

```env
Cloudflare D1_URI=your_Cloudflare D1_connection_string
JWT_SECRET=your_secret_key
NEXT_PUBLIC_API_URL=your_api_url
```

## Next Steps (Recommendations)

1. Add validation middleware for all routes
2. Implement bulk score upload for efficiency
3. Add report card generation at end of term
4. Implement student promotion to next class
5. Add attendance tracking
6. Implement notifications for parents
7. Add analytics dashboard for admin
8. Implement data export features (PDF reports)

All changes maintain the Nigerian education system structure and ensure proper authorization at every level.
