# Developer Onboarding Guide

## Welcome to the Reschool Manager System

This is a **production-grade school management system** built with Next.js, Cloudflare D1, and TypeScript. This guide helps new developers understand and contribute to the codebase.

---

## 🎯 Project Goals

The system enables schools to:
- ✅ Track student lifecycle from admission → graduation
- ✅ Manage daily marking (classwork, homework, tests, exams) with payment gating
- ✅ Generate termly report cards with automatic rankings
- ✅ Issue certificates with digital verification
- ✅ Track attendance and send alerts
- ✅ Provide AI-powered career guidance (JSS3 streams + SSS3 paths)
- ✅ Manage announcements and multi-channel notifications
- ✅ Export data in CSV/JSON formats
- ✅ Maintain full audit trails for compliance

---

## 🏗️ Architecture

### File Structure
```
app/
├── api/                     # All API endpoints
│   ├── students/           # Student lifecycle APIs
│   ├── certificates/       # Certificate management
│   ├── attendance/         # Attendance tracking
│   ├── scores/            # Mark/score APIs
│   ├── remarks/           # Teacher remarks
│   ├── ai/                # AI guidance
│   ├── audit/             # Audit trails
│   ├── notifications/     # Notification system
│   ├── reports/           # Report generation
│   ├── export/            # Data export
│   ├── teachers/          # Teacher leaderboard
│   ├── announcements/     # Announcements
│   ├── parents/           # Parent APIs
│   ├── auth/              # Authentication
│   └── ...
│
├── models/                 # Cloudflare D1 schemas
│   ├── Students.ts
│   ├── DailyMark.ts
│   ├── Score.ts
│   ├── ReportCard.ts
│   ├── Certificate.ts
│   ├── AttendanceRecord.ts
│   ├── TeacherRemark.ts
│   ├── Notification.ts
│   ├── StudentLifecycleRecord.ts
│   └── ...
│
├── utils/                 # Helper functions
│   ├── db.ts             # Cloudflare D1 connection
│   ├── auth.ts           # JWT verification
│   ├── permissions.ts    # Access control
│   ├── termGuard.ts      # Payment gating
│   └── ...
│
├── components/           # React components
├── admin/               # Admin pages
├── parent/              # Parent pages
├── teacher/             # Teacher pages
├── login/               # Auth pages
└── globals.css          # Styling
```

---

## 🚀 Getting Started

### 1. Setup Environment
```bash
# Install dependencies
pnpm install

# Create .env.local (ask team for real values)
Cloudflare D1_URI=Cloudflare D1+srv://user:pass@cluster.Cloudflare D1.net/reschool
JWT_SECRET=your_secret_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Start Development Server
```bash
pnpm dev
# App runs at http://localhost:3000
```

### 3. Explore the API
```bash
# Get a JWT token (login first or use test token)
curl http://localhost:3000/api/teachers/leaderboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Database
```bash
# Cloudflare D1 must be running locally or accessible via Cloudflare D1_URI
# Connect to Cloudflare D1 Compass to view data
```

---

## 📚 Understanding the Codebase

### Models (Data Layer)
**Location:** `app/models/`

Models define database schemas and relationships:
```typescript
// Example: DailyMark model
const dailyMarkSchema = new Schema({
  studentId: ObjectId,      // Reference to Students
  termId: ObjectId,         // Reference to Term
  assessmentType: String,   // CLASSWORK | HOMEWORK | EVALUATION | EXAM
  score: Number,            // 0-100
  modificationHistory: [{   // Audit trail
    field: String,
    oldValue: Number,
    newValue: Number,
    modifiedBy: String,
    modifiedDate: Date,
    reason: String
  }]
});
```

**Key Principles:**
- All models include `schoolId` for multi-tenancy
- Timestamps: `createdAt`, `updatedAt` included by default
- Audit fields: `recordedBy`, `lastModifiedBy`, `modificationHistory`
- Indices defined for frequently queried fields

### APIs (Route Handlers)
**Location:** `app/api/`

Each route is a Next.js API handler:
```typescript
// Example: GET /api/teachers/leaderboard
export async function GET(req: Request) {
  // 1. Verify JWT token
  const user = verifyToken(token);
  if (!user) return 403 Unauthorized
  
  // 2. Validate parameters
  if (!required_param) return 400 Bad Request
  
  // 3. Database query
  const data = await Model.find({...});
  
  // 4. Return response
  return NextResponse.json({...});
}
```

**Key Principles:**
- Every route requires JWT authentication
- Always filter by `schoolId` (multi-tenancy)
- Validate input parameters
- Return proper HTTP status codes
- Include descriptive error messages

### Authentication
**File:** `app/utils/auth.ts`

```typescript
// Verify JWT token
const user = verifyToken(token);
// Returns: { id, userId, schoolId, role, email }

// Check term access (payment gating)
await checkTermAccess(schoolId, termId);
// Throws: 402 Payment Required if not paid
```

### Access Control  
**File:** `app/utils/permissions.ts`

Access is controlled by user role:
```typescript
if (user.role === "ADMIN") {
  // Can do anything
} else if (user.role === "TEACHER") {
  // Can only access own class/marks
} else if (user.role === "PARENT") {
  // Can only access own ward
} else if (user.role === "STUDENT") {
  // Read-only access to own data
}
```

---

## 🔧 Common Tasks

### Adding a New API Endpoint

**Step 1:** Create route file
```bash
mkdir -p app/api/myfeature
touch app/api/myfeature/route.ts
```

**Step 2:** Write handler
```typescript
import connectDB from "@/app/utils/db";
import MyModel from "@/app/models/MyModel";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    // 1. Authenticate
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    
    // 2. Parse request
    const body = await req.json();
    const { requiredParam } = body;
    
    // 3. Validate
    if (!requiredParam) {
      return NextResponse.json({ error: "requiredParam is required" }, { status: 400 });
    }
    
    // 4. Query database
    const result = await MyModel.create({
      schoolId: user.schoolId,
      ...data
    });
    
    // 5. Return response
    return NextResponse.json({ message: "Success", data: result });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Step 3:** Test it
```bash
curl -X POST http://localhost:3000/api/myfeature \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requiredParam": "value"}'
```

### Adding a New Model

**Step 1:** Create model file
```bash
touch app/models/MyModel.ts
```

**Step 2:** Define schema
```typescript
import Drizzle ORM, { Schema, Document } from "Drizzle ORM";

export interface IMyModel extends Document {
  schoolId: Drizzle ORM.Types.ObjectId;
  name: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const myModelSchema = new Schema<IMyModel>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

// Add indices for common queries
myModelSchema.index({ schoolId: 1, createdAt: -1 });
myModelSchema.index({ email: 1 });

export default Drizzle ORM.models.MyModel || Drizzle ORM.model<IMyModel>("MyModel", myModelSchema);
```

**Step 3:** Import and use in API
```typescript
import MyModel from "@/app/models/MyModel";

const data = await MyModel.findOne({ schoolId, email });
```

### Implementing Access Control

**For ADMIN only:**
```typescript
if (user.role !== "ADMIN") {
  return NextResponse.json(
    { error: "Unauthorized. Admin access required." },
    { status: 403 }
  );
}
```

**For PARENT (own ward):**
```typescript
const student = await Students.findOne({ _id: studentId, schoolId: user.schoolId });
if (student.parentId.toString() !== user.id) {
  return NextResponse.json(
    { error: "Cannot access another's data" },
    { status: 403 }
  );
}
```

**For TEACHER (own class):**
```typescript
const classData = await Class.findOne({
  _id: classId,
  classTutorId: user.id,
  schoolId: user.schoolId
});
if (!classData) {
  return NextResponse.json(
    { error: "Cannot access this class" },
    { status: 403 }
  );
}
```

### Adding Audit Trail

```typescript
const modifications = existingData.modificationHistory || [];

if (existingData.fieldName !== newValue) {
  modifications.push({
    field: "fieldName",
    oldValue: existingData.fieldName,
    newValue: newValue,
    modifiedBy: user.id,
    modifiedDate: new Date(),
    reason: req.body.reason
  });
}

await MyModel.updateOne(
  { _id: id },
  {
    fieldName: newValue,
    modificationHistory: modifications,
    lastModifiedBy: user.id,
    lastModifiedDate: new Date()
  }
);
```

### Triggering Notifications

```typescript
// Import notification helpers
import {
  notifyReportReady,
  notifyPaymentDue,
  notifyLowAttendance,
  notifyMarkUpdate
} from "@/app/api/notifications/send/route";

// Call when event occurs
await notifyMarkUpdate(
  school_id,
  student_id,
  assessment_type
);
```

---

## 📖 Key Concepts

### School Scoping (Multi-tenancy)
Every query filters by `schoolId`:
```typescript
const students = await Students.find({ schoolId: user.schoolId });
// NOT: const students = await Students.find(); ❌
```

### Payment Gating (Term-based Access)
Mark operations are blocked if term not paid:
```typescript
// In daily mark creation
await checkTermAccess(user.schoolId, termId);
// Throws: 402 Payment Required if not paid
```

### Role-Based Access
Every endpoint enforces role checking:
```typescript
// ADMIN can do anything
if (user.role === "ADMIN") { ... }
// TEACHER can access own class only
else if (user.role === "TEACHER") { ... }
// PARENT can access own ward only
else if (user.role === "PARENT") { ... }
```

### Audit Trails
All mark changes are tracked for compliance:
```typescript
modificationHistory: [
  {
    field: "score",
    oldValue: 45,
    newValue: 50,
    modifiedBy: teacher_id,
    modifiedDate: timestamp,
    reason: "Calculation error"
  }
]
```

---

## 🧪 Testing Endpoints

### Using cURL (Command Line)
```bash
# Get auth token (from login endpoint)
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Make authenticated request
curl http://localhost:3000/api/teachers/leaderboard \
  -H "Authorization: Bearer $TOKEN"

# With POST data
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MARK_UPDATE",
    "title": "Test",
    "message": "Test message",
    "recipientIds": ["..."]
  }'
```

### Using Postman
1. Create collection folder
2. Add request with URL
3. Set header: `Authorization: Bearer YOUR_TOKEN`
4. Set body (JSON) if POST/PUT
5. Send and view response

### Using VS Code REST Client
```
# api.rest file
@baseUrl = http://localhost:3000
@token = your_jwt_token

### Get leaderboard
GET @baseUrl/api/teachers/leaderboard
Authorization: Bearer @token
```

---

## 🐛 Debugging

### Check Cloudflare D1 Connection
```typescript
// In any route
const client = await connectDB();
console.log("Connected to:", process.env.Cloudflare D1_URI);
```

### Log Database Queries
```typescript
// Add debug logging
const data = await MyModel.find({ ... }).lean();
console.log("Query result:", data);
```

### Verify JWT Token
```typescript
const user = verifyToken(token);
console.log("Decoded user:", user);
if (!user) console.log("Token invalid");
```

### Check Error Details
```typescript
catch (error: any) {
  console.error("Full error:", error);
  console.error("Error message:", error.message);
  console.error("Error stack:", error.stack);
}
```

---

## 📚 Documentation Files

**For quick reference, see:**
- `API_REFERENCE_CARD.md` - All endpoints at a glance
- `NOTIFICATION_INTEGRATION_GUIDE.md` - How to use notifications
- `PHASE_2_IMPLEMENTATION.md` - Complete API details
- `SYSTEM_STATUS_COMPLETE.md` - Project status & roadmap

---

## 🚨 Common Mistakes

### ❌ Don't Do This

**1. Forgetting to filter by schoolId**
```typescript
// WRONG
const students = await Students.find();
// Every user sees every school's students!

// RIGHT
const students = await Students.find({ schoolId: user.schoolId });
```

**2. Skipping access control**
```typescript
// WRONG
const data = await MyModel.findById(id);
// Any role can access any data!

// RIGHT
if (user.role !== "ADMIN") return 403;
const data = await MyModel.findById(id);
```

**3. Not validating required parameters**
```typescript
// WRONG
const { studentId } = req.body;
const student = await Students.findById(studentId);
// Crashes if studentId is missing!

// RIGHT
const { studentId } = req.body;
if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
const student = await Students.findById(studentId);
```

**4. Forgetting try-catch**
```typescript
// WRONG
const data = await MyModel.find(query);
return response; // If query fails, endpoint crashes!

// RIGHT
try {
  const data = await MyModel.find(query);
  return response;
} catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

**5. Returning sensitive data**
```typescript
// WRONG
const admin = await User.findById(userId).select("+password");
return NextResponse.json({ admin }); // Password exposed!

// RIGHT
const admin = await User.findById(userId).select("-password");
return NextResponse.json({ admin });
```

---

## 📋 Checklist Before Submitting Code

- [ ] All functions have error handling (try-catch)
- [ ] Input parameters are validated
- [ ] Access control is enforced (role check)
- [ ] Data is filtered by schoolId
- [ ] Response includes appropriate HTTP status code
- [ ] Console.error() used for debugging (not console.log)
- [ ] No hardcoded values (use env variables)
- [ ] Database indices exist for queries
- [ ] Audit trail recorded if data changes
- [ ] Code follows TypeScript best practices
- [ ] Endpoint documented in API_REFERENCE_CARD.md

---

## 📞 Getting Help

1. **API not working?** → Check `API_REFERENCE_CARD.md`
2. **Not sure how to integrate?** → Read `NOTIFICATION_INTEGRATION_GUIDE.md`
3. **Need endpoint details?** → See `PHASE_2_IMPLEMENTATION.md`
4. **Want project overview?** → Review `SYSTEM_STATUS_COMPLETE.md`

---

## 🎓 Learning Resources

### TypeScript
- Official docs: https://www.typescriptlang.org/docs/
- Types for Node.js: `npm install --save-dev @types/node`

### Next.js
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Deployment: https://nextjs.org/docs/deployment

### Cloudflare D1
- Query guide: https://docs.Cloudflare D1.com/manual/reference/method/
- Drizzle ORM docs: https://Drizzle ORMjs.com/docs/api.html

### JWT
- Explanation: https://jwt.io/introduction
- Node.js: `npm install jsonwebtoken`

---

**Welcome aboard!** 🚀
Start by reading the `API_REFERENCE_CARD.md` and exploring the `/app/api/` folder.
Feel free to ask questions in the team chat!

---

**Last Updated:** December 15, 2024
**Status:** Complete & Ready for Contributions
