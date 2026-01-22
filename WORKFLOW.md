# ReSchool System Workflow

## Overview
This system is designed for Nigerian primary and secondary schools following the standard education structure (JSS1-3, SSS1-3).

## System Workflow

### 1. School Registration & Payment
- Schools pay for the service to access the platform
- Upon payment verification, a school account is created
- An admin user account is automatically set up for the school

### 2. Admin Setup (School Administrator)

#### a. Create Academic Year/Session
**Endpoint:** `POST /api/academic-years/create`
- Admin creates academic year (e.g., "2023/2024 Academic Year")
- Sets term (1st, 2nd, or 3rd term)
- Sets start and end dates
- Only one academic year can be active at a time

#### b. Create Subjects
**Endpoint:** `POST /api/subjects`
- Create subjects like Mathematics, English Language, Basic Science, etc.
- Each subject has a name and optional code

#### c. Create Classes
**Endpoint:** `POST /api/classes/create`
- Create classes with level (JSS1-3, SSS1-3) and arm (A, B, C)
- Examples: JSS 1A, JSS 1B, JSS 1C, etc.

#### d. Link Subjects to Classes
**Endpoint:** `POST /api/classes/link-subjects`
- Specify which subjects are taught in which classes
- Different classes may have different subject combinations

#### e. Create Teacher Accounts
**Endpoint:** `POST /api/teachers/create`
- Create teacher user accounts with credentials
- Assign teacher as **class teacher** to a specific class (optional)
- Specify which **subjects** and **classes** the teacher teaches
- Example: Teacher A is class teacher of JSS 1C and teaches Mathematics in JSS 1A, 1B, 1C

#### f. Create Parent Accounts
**Endpoint:** `POST /api/users/create` (with role: "PARENT")
- Create parent user accounts
- Parents will later be linked to their children (wards)

### 3. Student Management (Class Teachers Only)

**Endpoint:** `POST /api/students/create`

**Permission Rule:** Only the class teacher assigned to a specific class can create student records for that class.

- Class teacher fills in basic student information:
  - Full name
  - Link to parent account
  - Current class assignment
- Students are automatically tied to their class and parent accounts
- Parents can view their ward's information through their account

### 4. Score Entry (Subject Teachers Only)

**Endpoint:** `POST /api/scores/upload`

**Permission Rule:** Only teachers assigned to teach BOTH the specific subject AND the specific class can edit scores.

#### Score Components (Nigerian System):
- **Classwork:** 0-10 marks
- **Homework:** 0-10 marks  
- **Extracurricular:** 0-10 marks
- **Test:** 0-30 marks
- **Exam:** 0-60 marks
- **Total:** Automatically calculated (max 100)

#### Workflow:
1. Teacher must be assigned to teach the subject in that class
2. Teacher enters scores for students in their assigned classes
3. System verifies teacher authorization before allowing edit
4. Other users (admin, other teachers, parents) can **view** scores but cannot edit
5. Scores are tied to:
   - Student
   - Class
   - Subject
   - Term
   - Academic Year
   - Recording Teacher

### 5. Viewing Scores

#### For Teachers
**Endpoint:** `GET /api/scores/view`
- Can view all scores
- Can edit only scores for subjects/classes they teach

#### For Parents
**Endpoint:** `GET /api/parents/ward-scores`
- Can view their ward's scores across all subjects
- Read-only access

#### For Admin
**Endpoint:** `GET /api/scores/view`
- Can view all scores for the school
- Full visibility across all classes, subjects, and terms

### 6. End of Term Processing
At the end of each term:
- All scores should be finalized
- Reports can be generated
- System prepares for next term or academic year

## Key Permission Rules

| Action | Admin | Class Teacher | Subject Teacher | Parent |
|--------|-------|---------------|-----------------|--------|
| Create Academic Year | ✓ | ✗ | ✗ | ✗ |
| Create Subjects | ✓ | ✗ | ✗ | ✗ |
| Create Classes | ✓ | ✗ | ✗ | ✗ |
| Link Subjects to Classes | ✓ | ✗ | ✗ | ✗ |
| Create Teachers | ✓ | ✗ | ✗ | ✗ |
| Create Parents | ✓ | ✗ | ✗ | ✗ |
| Create Students | ✓ | ✓ (own class only) | ✗ | ✗ |
| Edit Scores | ✗ | ✓ (own subject/class) | ✓ (own subject/class) | ✗ |
| View Scores | ✓ (all) | ✓ (all) | ✓ (all) | ✓ (own wards only) |

## Database Models

### School
- name
- domainSlug
- logoUrl
- adminUserId

### User
- schoolId
- fullName
- email
- passwordHash
- role (ADMIN, TEACHER, PARENT)
- isActive

### TeacherProfile
- schoolId
- userId (reference to User)
- classTeacherOf (optional - class they are class teacher of)
- subjectsAndClasses (array of subjects and classes they teach)

### Subject
- schoolId
- name
- code (optional)

### Class
- schoolId
- level (JSS1, JSS2, JSS3, SSS1, SSS2, SSS3)
- arm (A, B, C)
- classTeacherId (reference to User)
- studentIds (array)
- subjectIds (array of subjects taught in this class)

### Student
- schoolId
- fullName
- parentId (reference to User)
- currentClassId (reference to Class)

### AcademicYear
- schoolId
- name (e.g., "2023/2024")
- startDate
- endDate
- isActive
- term (1, 2, or 3)

### Score
- schoolId
- academicYearId
- studentId
- classId
- subjectId
- term
- classwork (0-10)
- homework (0-10)
- extracurricular (0-10)
- test (0-30)
- exam (0-60)
- total (auto-calculated)
- teacherId (who recorded the score)

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - Login for all users
- `POST /api/schools/register` - Register new school

### Admin Operations
- `POST /api/academic-years/create` - Create academic year
- `GET /api/academic-years/list` - List academic years
- `POST /api/academic-years/set-active` - Set active academic year
- `POST /api/subjects` - Create subject
- `GET /api/subjects` - List subjects
- `POST /api/classes/create` - Create class
- `POST /api/classes/link-subjects` - Link subjects to class
- `POST /api/teachers/create` - Create teacher with assignments
- `POST /api/users/create` - Create parent account

### Teacher Operations
- `GET /api/teachers/create` - Get own teacher profile
- `POST /api/students/create` - Create student (class teachers only)
- `POST /api/scores/upload` - Upload/edit scores (authorized teachers only)
- `GET /api/scores/view` - View scores

### Parent Operations
- `GET /api/parents/ward-scores` - View ward's scores

### General
- `GET /api/scores/view` - View scores (with filters)

## Example Usage Flow

1. **School Setup:**
   ```
   Admin creates 2023/2024 session, Term 1
   Admin creates subjects: Math, English, Science, etc.
   Admin creates classes: JSS 1A, JSS 1B, JSS 1C
   Admin links subjects to classes
   ```

2. **Teacher Setup:**
   ```
   Admin creates Teacher John:
   - Class teacher of JSS 1A
   - Teaches Mathematics in JSS 1A, 1B, 1C
   
   Admin creates Teacher Mary:
   - Class teacher of JSS 1B  
   - Teaches English in JSS 1A, 1B
   ```

3. **Student Creation:**
   ```
   Teacher John (class teacher of JSS 1A) creates students for JSS 1A
   Teacher Mary (class teacher of JSS 1B) creates students for JSS 1B
   ```

4. **Score Entry:**
   ```
   Teacher John enters Math scores for JSS 1A, 1B, 1C students
   Teacher Mary enters English scores for JSS 1A, 1B students
   ```

5. **Parent Access:**
   ```
   Parents log in to view their ward's scores across all subjects
   ```

This workflow ensures proper authorization and data integrity throughout the school management process.
