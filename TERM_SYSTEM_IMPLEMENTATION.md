# Term-Based Payment System - Implementation Summary

## Overview
The system has been updated to support **term-based operations and payments**. Each academic year now automatically creates 3 separate terms, and all operations are restricted to paid terms only.

---

## Key Changes

### 1. **New Term Model** ([app/models/Term.ts](app/models/Term.ts))
- Each academic year has **3 separate Term entities**
- Term fields:
  - `termNumber`: 1, 2, or 3
  - `startDate` & `endDate`: Date range for the term
  - `isActive`: Only one term can be active per school
  - `isPaid`: Payment status (schools must pay per term)
  - `isClosed`: When true, no edits allowed
  - `paymentDate` & `paymentReference`: Track payment details

### 2. **Automatic Term Creation**
When an academic year is created ([app/api/academic-years/create/route.ts](app/api/academic-years/create/route.ts)):
- System automatically creates 3 terms
- Divides the academic year duration equally among the 3 terms
- First term is set as active if the academic year is set as active

### 3. **Term Management APIs**
New endpoints for term operations:

- **GET** `/api/terms/list` - List all terms (with optional filters)
- **GET** `/api/terms/active` - Get the current active term
- **POST** `/api/terms/set-active` - Activate a specific term
- **POST** `/api/terms/mark-paid` - Mark a term as paid
- **POST** `/api/terms/close` - Close a term (prevents further edits)

### 4. **Payment Guard** ([app/utils/termGuard.ts](app/utils/termGuard.ts))
New utility functions to enforce payment requirements:
- `checkTermAccess()` - Verifies current term is paid and open
- `checkSpecificTermAccess()` - Checks if a specific term is accessible
- `getPaidTerms()` - Returns all paid terms for historical data access
- `canPerformOperations()` - Boolean check for operation permission

### 5. **Protected Operations**
Score upload now requires paid term ([app/api/scores/upload/route.ts](app/api/scores/upload/route.ts)):
- Returns **402 Payment Required** if term is not paid
- Prevents operations on closed terms
- All mark entry operations are gated by term payment status

### 6. **Updated Dashboards**
- **Parent Dashboard** ([app/api/parents/dashboard/route.ts](app/api/parents/dashboard/route.ts)):
  - Shows current term payment status
  - Only displays data from paid terms
  
- **Admin Dashboard** ([app/api/admin/stats/route.ts](app/api/admin/stats/route.ts)):
  - Displays active term info with payment status
  - Shows term dates and closed status

- **Parent Academic Years** ([app/api/parents/academic-years/route.ts](app/api/parents/academic-years/route.ts)):
  - Now returns terms instead of academic years
  - Parents can only access paid terms (historical data)

---

## Workflow

### Academic Year & Term Creation
1. Admin creates a new academic year (e.g., "2025/2026")
2. System automatically creates 3 terms with equal date ranges
3. If set as active, Term 1 becomes the active term

### Payment Process
1. School pays for the current term via payment API
2. Admin marks term as paid: `POST /api/terms/mark-paid`
3. Term becomes accessible for operations
4. Teachers can now upload marks for that term

### Term Operations
1. **During Active Term**: Teachers upload marks, parents view reports
2. **Payment Required**: All operations blocked if term unpaid (402 error)
3. **Closing Term**: Admin closes term when complete
4. **Moving to Next Term**: Admin activates the next term
5. **After 3 Terms**: Students promoted, new academic year starts

### Historical Access
- Parents can view any **paid term** from previous years
- Unpaid terms remain inaccessible
- Closed terms are read-only

---

## HTTP Status Codes
- `200` - Success
- `402` - Payment Required (term not paid)
- `403` - Unauthorized (wrong role or closed term)
- `404` - Term not found

---

## Database Schema Changes
### Term Collection (New)
```typescript
{
  schoolId: ObjectId,
  academicYearId: ObjectId,
  termNumber: 1 | 2 | 3,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  isPaid: Boolean,
  isClosed: Boolean,
  paymentDate: Date,
  paymentReference: String
}
```

### Academic Year (No breaking changes)
- Kept existing `term` field for backward compatibility
- Gets updated when a term is activated

---

## Next Steps for Admin Panel
To complete the system, the admin panel should include:
1. **Term List View** - Display all terms with payment status
2. **Payment Button** - Mark term as paid after payment verification
3. **Activate Term Button** - Switch to next term
4. **Close Term Button** - Lock term after completion
5. **Payment Status Badge** - Visual indicator for paid/unpaid terms
6. **Promotion Workflow** - After Term 3, promote students to next class

---

## Testing Checklist
- [ ] Create academic year and verify 3 terms are created
- [ ] Try uploading marks without payment (should get 402)
- [ ] Mark term as paid and retry mark upload (should succeed)
- [ ] Close term and try editing (should be blocked)
- [ ] Activate next term and verify operations work
- [ ] Check parent dashboard shows only paid terms
- [ ] Verify promotion works after Term 3

---

## Important Notes
⚠️ **Breaking Change**: APIs that previously used `AcademicYear.term` now use the `Term` model
⚠️ **Payment Required**: All score operations require the current term to be paid
✅ **Backward Compatible**: Existing academic years still work, new terms will be created going forward
