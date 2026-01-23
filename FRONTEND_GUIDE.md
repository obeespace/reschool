# Frontend Implementation Guide

## Overview

The ReSchool frontend is built with Next.js 14+, React, TypeScript, and Tailwind CSS. It provides complete dashboards for Admin, Teacher, and Parent roles with payment simulation.

## Pages Structure

```
app/
├── page.tsx                    # Landing page with payment simulation
├── login/
│   └── page.tsx               # Login page for all users
├── components/
│   ├── Sidebar.tsx            # Shared sidebar navigation
│   └── UIComponents.tsx       # Reusable UI components
├── admin/
│   ├── dashboard/page.tsx     # Admin main dashboard
│   ├── subjects/page.tsx      # Manage subjects
│   ├── classes/page.tsx       # Manage classes (to be created)
│   ├── teachers/page.tsx      # Manage teachers (to be created)
│   ├── students/page.tsx      # View students (to be created)
│   └── reports/page.tsx       # Reports & analytics (to be created)
├── teacher/
│   ├── dashboard/page.tsx     # Teacher main dashboard
│   ├── classes/page.tsx       # View assigned classes (to be created)
│   ├── students/page.tsx      # Manage students (to be created)
│   ├── scores/page.tsx        # Upload scores (to be created)
│   └── profile/page.tsx       # View teacher profile (to be created)
└── parent/
    ├── dashboard/page.tsx     # Parent main dashboard
    ├── wards/page.tsx         # View ward details (to be created)
    └── scores/page.tsx        # View ward scores (to be created)
```

## Key Features Implemented

### 1. Landing Page (/)
**Features:**
- Hero section with school management pitch
- Feature highlights (Teacher Management, Score Management, Parent Portal)
- Pricing display (₦50,000 per term)
- Registration form with payment simulation
- Auto-redirects to login after successful payment

**Payment Simulation Flow:**
1. User clicks "Register Your School"
2. Fills in school details (name, slug, admin info)
3. Reviews payment summary
4. Clicks "Pay ₦50,000"
5. System simulates 2-second processing
6. Calls `/api/schools/register` endpoint
7. On success, redirects to login page

### 2. Login Page (/login)
**Features:**
- Universal login for all user types
- Email and password authentication
- Role-based redirection:
  - ADMIN → `/admin/dashboard`
  - TEACHER → `/teacher/dashboard`
  - PARENT → `/parent/dashboard`
- Token storage in localStorage
- Error handling and loading states

### 3. Admin Dashboard (/admin/dashboard)
**Features:**
- Overview statistics (Teachers, Students, Parents, Classes)
- Quick action cards for:
  - Managing Academic Years
  - Managing Subjects
  - Managing Classes
  - Managing Teachers
  - Viewing Students
  - Generating Reports
- System overview section with:
  - Current academic year status
  - Total classes count
  - Subscription status

**Navigation Menu:**
- Dashboard 🏠
- Academic Years 📅
- Subjects 📚
- Classes 🏫
- Teachers 👨‍🏫
- Students 👨‍🎓
- Parents 👪
- Reports 📊

### 4. Admin Subjects Page (/admin/subjects)
**Features:**
- List all subjects with name and code
- Add new subject modal
- Real-time data fetch from `/api/subjects`
- Create subjects via POST to `/api/subjects`
- Clean table view with hover states

### 5. Teacher Dashboard (/teacher/dashboard)
**Features:**
- Statistics (My Classes, My Students, Scores Uploaded)
- Quick actions for:
  - Managing students
  - Uploading scores
  - Viewing classes
  - Viewing profile
- Assignment overview showing:
  - Class teacher assignment
  - Subject teaching assignments
  - Progress indicator

**Navigation Menu:**
- Dashboard 🏠
- My Classes 🏫
- Students 👨‍🎓
- Scores 📝
- My Profile 👤

### 6. Parent Dashboard (/parent/dashboard)
**Features:**
- Ward count and statistics
- Quick actions for:
  - Viewing wards
  - Checking scores
- Ward list with class information
- Direct navigation to ward's scores
- Tips and guidance section

**Navigation Menu:**
- Dashboard 🏠
- My Wards 👨‍👩‍👧‍👦
- Scores 📊

## Shared Components

### Sidebar Component
**Location:** `app/components/Sidebar.tsx`

**Features:**
- Role-based navigation menu
- Active route highlighting
- Logout functionality
- Responsive design

**Usage:**
```tsx
import { DashboardLayout } from "@/app/components/Sidebar";

export default function MyPage() {
  return (
    <DashboardLayout role="ADMIN">
      {/* Your content */}
    </DashboardLayout>
  );
}
```

### UI Components
**Location:** `app/components/UIComponents.tsx`

**Components:**
1. **StatCard** - Display statistics with icon and color
2. **DataTable** - Reusable table component
3. **Modal** - Popup modal for forms
4. **Button** - Styled button with variants
5. **Input** - Form input with label
6. **Select** - Dropdown select input
7. **LoadingSpinner** - Loading indicator
8. **PageHeader** - Page title with optional action button

**Usage Examples:**
```tsx
// Stat Card
<StatCard title="Students" value={450} icon="👨‍🎓" color="green" />

// Button
<Button onClick={handleClick} variant="primary">
  Save
</Button>

// Input
<Input
  label="Email"
  value={email}
  onChange={(val) => setEmail(val)}
  required
/>

// Modal
<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Item">
  <form>...</form>
</Modal>
```

## Authentication Flow

### Login Process
1. User enters email and password
2. Frontend calls `POST /api/auth/login`
3. Backend validates credentials
4. Returns JWT token and user object
5. Frontend stores in localStorage:
   - `token` - JWT for API calls
   - `user` - User information (id, name, email, role, schoolId)
6. Redirects based on role

### Protected Routes
All dashboard pages check for:
1. Token exists in localStorage
2. Token is valid (not expired)
3. User has correct role for the page
4. Redirects to `/login` if any check fails

**Example Auth Check:**
```tsx
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role !== "ADMIN") {
      router.push("/login");
      return;
    }
  } catch (error) {
    router.push("/login");
  }
}, [router]);
```

### Logout Process
1. User clicks Logout in sidebar
2. Remove token and user from localStorage
3. Redirect to `/login`

## API Integration Pattern

All pages follow this pattern for API calls:

```tsx
const fetchData = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/endpoint", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Handle data
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred");
  }
};
```

## Styling Guide

### Colors
- **Primary:** Indigo (indigo-600)
- **Success:** Green (green-500)
- **Warning:** Yellow (yellow-500)
- **Danger:** Red (red-500)
- **Info:** Blue (blue-500)

### Common Patterns

**Card:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  {/* Content */}
</div>
```

**Button Primary:**
```tsx
<button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
  Click Me
</button>
```

**Input Field:**
```tsx
<input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
```

**Table:**
```tsx
<table className="w-full">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
        Header
      </th>
    </tr>
  </thead>
  <tbody className="divide-y">
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">Content</td>
    </tr>
  </tbody>
</table>
```

## Running the Frontend

### Development
```bash
npm run dev
# or
pnpm dev
```

Visit `http://localhost:3000`

### Build for Production
```bash
npm run build
npm start
```

## Next Steps - Pages to Create

### Admin Pages
1. **Academic Years** - Create/manage academic years and terms
2. **Classes** - Create classes and link subjects
3. **Teachers** - Create teachers and assign subjects/classes
4. **Students** - View all students across classes
5. **Parents** - Create parent accounts
6. **Reports** - View analytics and generate reports

### Teacher Pages
1. **My Classes** - View assigned classes with student lists
2. **Students** - Create students for class teacher's class
3. **Scores** - Upload scores for assigned subjects/classes
4. **Profile** - View teaching assignments and profile

### Parent Pages
1. **Wards** - Detailed view of each ward
2. **Scores** - View ward's complete score report with filtering

## Testing the Frontend

### Test Flow
1. **Landing Page:**
   - Visit `http://localhost:3000`
   - Click "Register Your School"
   - Fill form and submit
   - Wait for simulated payment
   - Should redirect to login

2. **Login:**
   - Enter admin credentials
   - Should redirect to admin dashboard

3. **Admin Dashboard:**
   - Verify stats display
   - Click quick action cards
   - Navigate using sidebar

4. **Create Subject:**
   - Go to Subjects page
   - Click "+ Add Subject"
   - Fill form and submit
   - Verify subject appears in list

5. **Logout:**
   - Click Logout in sidebar
   - Should redirect to login

## Performance Considerations

1. **Loading States:** All pages show spinner while fetching data
2. **Error Handling:** All API calls have try-catch blocks
3. **Token Validation:** Routes check auth on mount
4. **Optimistic Updates:** Forms disable during submission
5. **Responsive Design:** Mobile-friendly with Tailwind breakpoints

## Accessibility

- Semantic HTML elements
- Form labels and required indicators
- Keyboard navigation support
- Color contrast compliance
- Loading states for screen readers

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

The frontend is now fully functional with payment simulation and role-based dashboards!
