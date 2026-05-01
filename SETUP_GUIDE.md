# Quick Setup Guide

This guide helps you set up a test school with sample data.

## Step 1: Set Up Environment

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/reschool
# OR use MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/reschool

JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
```

## Step 3: Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

The server will start at http://localhost:3000

## Step 4: Register a School

Use the school registration endpoint:

```bash
POST /api/schools/register
```

```json
{
  "schoolName": "Divine Grace Secondary School",
  "domainSlug": "divine-grace",
  "adminName": "Principal Adebayo",
  "adminEmail": "admin@divinegrace.edu.ng",
  "adminPassword": "AdminPass123!"
}
```

## Step 5: Run Setup Commands

After registering, login as admin and run these setup commands in order:

### 1. Create Academic Year
```json
POST /api/academic-years/create
{
  "name": "2024/2025 Academic Year",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2025-07-31T00:00:00.000Z",
  "term": 1
}
```

### 2. Create Subjects
Run for each subject:
```json
POST /api/subjects
{
  "name": "Mathematics",
  "code": "MATH"
}
```

Common Nigerian Secondary School Subjects:
- Mathematics (MATH)
- English Language (ENG)
- Basic Science (SCI)
- Basic Technology (TECH)
- Social Studies (SOC)
- Civic Education (CIV)
- Physical & Health Education (PHE)
- Computer Studies (COMP)
- Christian Religious Studies (CRS) or Islamic Studies (ISL)
- Home Economics (HOME)
- Agricultural Science (AGRIC)
- Business Studies (BUS)
- French Language (FRE)
- Yoruba/Igbo/Hausa Language

### 3. Create Classes
```json
POST /api/classes/create
{
  "level": "JSS1",
  "arm": "A"
}
```

Create all needed classes:
- JSS1 A, B, C
- JSS2 A, B, C  
- JSS3 A, B, C
- SSS1 A, B, C (if applicable)
- SSS2 A, B, C (if applicable)
- SSS3 A, B, C (if applicable)

### 4. Link Subjects to Classes
```json
POST /api/classes/link-subjects
{
  "classId": "jss1a_id",
  "subjectIds": ["math_id", "eng_id", "sci_id", ...]
}
```

### 5. Create Teachers
```json
POST /api/teachers/create
{
  "fullName": "Mr. Chukwuma Obi",
  "email": "c.obi@divinegrace.edu.ng",
  "password": "Teacher123!",
  "classTeacherOf": "jss1a_id",
  "subjectsAndClasses": [
    {
      "subjectId": "math_id",
      "classIds": ["jss1a_id", "jss1b_id", "jss1c_id"]
    }
  ]
}
```

### 6. Create Parents
```json
POST /api/users/create
{
  "fullName": "Mrs. Amaka Nwosu",
  "email": "amaka.nwosu@email.com",
  "password": "Parent123!",
  "role": "PARENT"
}
```

## Step 6: Test the System

1. Login as teacher
2. Create students for your class
3. Upload scores for your subjects
4. Login as parent
5. View ward scores

## Common Issues

### MongoDB Connection Failed
- Ensure MongoDB is running
- Check MONGODB_URI in .env.local
- For local MongoDB: `mongod --dbpath=/path/to/data`

### JWT Token Errors
- Ensure JWT_SECRET is set and at least 32 characters
- Token expires after 7 days - login again

### Permission Denied
- Check user role matches the required permission
- Verify teacher has TeacherProfile created
- Ensure class teacher is assigned to correct class

## Directory Structure

```
reschool/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── schools/
│   │   ├── academic-years/
│   │   ├── subjects/
│   │   ├── classes/
│   │   ├── teachers/
│   │   ├── students/
│   │   ├── scores/
│   │   └── parents/
│   ├── models/
│   │   ├── School.ts
│   │   ├── User.ts
│   │   ├── TeacherProfile.ts
│   │   ├── Subject.ts
│   │   ├── Class.ts
│   │   ├── Students.ts
│   │   ├── Score.ts
│   │   └── AcademicYear.ts
│   └── utils/
│       ├── db.ts
│       ├── auth.ts
│       ├── permissions.ts
│       └── teacherPermissions.ts
├── .env.local
├── package.json
├── WORKFLOW.md
├── IMPLEMENTATION_SUMMARY.md
└── API_TESTING_GUIDE.md
```

## Next Steps After Setup

1. Build the frontend UI for each user role
2. Add data validation and error handling
3. Implement report card generation
4. Add bulk upload features for students/scores
5. Create analytics dashboard
6. Add notifications system
7. Implement data backup/export

## Support

For issues or questions:
1. Check WORKFLOW.md for system design
2. Check IMPLEMENTATION_SUMMARY.md for technical details
3. Check API_TESTING_GUIDE.md for API usage

## License

[Your License Here]
