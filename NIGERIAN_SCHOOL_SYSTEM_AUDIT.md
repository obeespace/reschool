# ReSchool — Nigerian Education System Audit & Gap Analysis
*Prepared May 1, 2026 | Not yet executed — review first*

---

## PART 1: How Nigerian Schools Actually Work

### 1.1 The National Structure — 6-3-3-4 System
Nigeria runs the **6-3-3-4** structure (and newer **9-3-4** UBE model):

| Stage | Classes | Ages | Exit Exam |
|---|---|---|---|
| Primary | Pry 1 – Pry 6 | 5–11 | FSLC (First School Leaving Certificate) |
| Junior Secondary (JSS) | JSS1 – JSS3 | 12–14 | BECE (Basic Education Certificate Exam) |
| Senior Secondary (SS) | SS1 – SS3 | 15–17 | WAEC SSCE + NECO SSCE |
| Pre-Primary (Elite Private) | Creche, Nursery 1–2, KG | 2–5 | — |

Private schools in Nigeria (especially top 1%) run the **full spectrum** — Crèche through SS3 — in a single campus.

---

### 1.2 Academic Calendar
```
First Term:   September → December   (~14 weeks)
Second Term:  January → March/April  (~13 weeks)
Third Term:   April/May → July       (~11 weeks + exams)
```
Academic year: **September to July**. New session starts each September.

---

### 1.3 Assessment & Grading (NERDC Standard)

**Score Breakdown (100 marks total):**
| Component | Marks |
|---|---|
| Continuous Assessment (CA): tests, assignments, practicals | 40 |
| Terminal Examination | 60 |
| **Total** | **100** |

CA can be further broken down (for internal records):
- First CA Test: 10–15 marks
- Second CA Test: 10–15 marks
- Assignment/Classwork: 5–10 marks
- Practical/Project (where applicable): 5–10 marks

**WAEC Grade Scale (used universally in Nigeria):**
| Grade | Range | Meaning |
|---|---|---|
| A1 | 75–100 | Excellent |
| B2 | 70–74 | Very Good |
| B3 | 65–69 | Good |
| C4 | 60–64 | Credit |
| C5 | 55–59 | Credit |
| C6 | 50–54 | Credit |
| D7 | 45–49 | Pass |
| E8 | 40–44 | Pass |
| F9 | 0–39 | Fail |

**Position System:** 1st, 2nd, 3rd — class ranking is culturally critical in Nigerian schools.

---

### 1.4 Subject Structure

**Primary (Pry 1–6):**
Maths, English, Basic Science, Social Studies, Agric Science, Computer Studies, Civic Education, Cultural/Creative Arts, French (optional), Yoruba/Hausa/Igbo (state language)

**JSS (1–3) — Universal Core:**
English Language, Mathematics, Basic Science & Technology, Social Studies, Civic Education, French, Computer Studies, Home Economics, Agricultural Science, Business Studies, Cultural & Creative Arts

**SS (1–3) by Track:**
- **Core (all tracks):** English Language, Mathematics, Civic Education, Economics or Commerce
- **Science:** Physics, Chemistry, Biology, Further Mathematics, Agricultural Science
- **Arts:** Literature in English, Government, History, Geography, Christian/Islamic Religious Studies
- **Commercial:** Commerce, Accounting, Financial Accounting, Business Studies

**SS Track Placement:** Happens at end of JSS3 based on BECE performance + aptitude.

---

### 1.5 Class Structure in Top Private Schools

**Naming conventions:**
- Standard: `JSS1A`, `JSS1B`, `JSS2 Gold`, `SS1 Science`
- Elite: Arms can be named (Gold, Silver, Diamond) or specialization (Science, Arts, Commercial) at SS level
- **SS-level streams** are a major feature: SS1 Science, SS1 Arts, SS1 Commercial — these are **not just arms, they are separate curricular tracks**

**Class sizes:**
- Public: 50–60 students
- Good private: 25–35 students
- Elite private: 15–25 students

**Prefect System:**
- Head Boy / Head Girl
- House Prefects (if school runs House System)
- Senior Prefects (class/subject)
- Library, Lab, Assembly Prefects

**House System (Boarding/Elite Day Schools):**
Typically 4 houses named after prominent Nigerians or colors/virtues: e.g., Awolowo, Balewa, Azikiwe, Zik OR Red, Blue, Green, Yellow.

---

### 1.6 Staff Structure (Beyond Teachers)
- Principal / Head Teacher
- Vice-Principal (Academics) / Vice-Principal (Admin)
- Head of Department (HOD) per subject area
- Form Teachers (Class Teachers — one per class arm)
- Subject Teachers
- Guidance Counsellor (mandatory per NERDC)
- Bursar / Accounts Officer
- School Librarian
- Lab Technicians
- Sports Master/Mistress

---

### 1.7 Parent Engagement (Nigerian Context)
- **PTA (Parents-Teachers Association):** Very active in Nigerian schools; holds meetings each term
- **Parent Portal Access:** Expected in modern schools — view scores, attendance, reports
- **Result collection:** Parents physically collect printed report cards in many schools; top schools now do digital + print
- **Communication:** WhatsApp groups are still dominant in practice; formal school systems need to integrate

---

### 1.8 Certificates Issued
| Certificate | When | Body |
|---|---|---|
| Nursery Leaving Certificate | KG completion | School |
| First School Leaving Certificate (FSLC) | Primary 6 | State/School |
| BECE Certificate | JSS3 | NECO (Junior) |
| WAEC SSCE | SS3 | WAEC |
| NECO SSCE | SS3 | NECO |
| School Leaving Certificate | SS3 | School (own) |

Top schools issue their own elegant leaving certificates alongside WAEC.

---

### 1.9 Fee Structure (What Schools Track)
- Tuition fees (per term)
- Development levy (annual)
- PTA levy
- Examination fees (BECE registration, WAEC/NECO registration)
- Sports fees
- Uniform fees (admission/annual)
- Books/stationery levy
- ICT levy
- Bus fees

---

## PART 2: Current ReSchool System Audit

### 2.1 What's Working ✅

| Feature | Status | Notes |
|---|---|---|
| Multi-tenant school registration | ✅ Good | One school per admin, isolated by schoolId |
| Academic Year management | ✅ Good | Active/inactive, start/end dates |
| Term management (1/2/3) | ✅ Good | isActive, isClosed, isPaid |
| Class + Arm structure | ✅ Basic | Level + Arm fields exist |
| Subject management | ✅ Good | Per school, linkable to classes |
| Student CRUD | ✅ Good | Admission number, class assignment |
| Teacher management | ✅ Good | TeacherProfile with subject+class assignments |
| Class teacher assignment | ✅ Good | `classTeacherOf` on TeacherProfile |
| Score recording | ✅ Good | Breakdown: classwork, homework, test, exam |
| Score audit trail | ✅ Excellent | modificationHistory on Score |
| Daily marks (CA) | ✅ Good | Per assessment type |
| Attendance tracking | ✅ Good | Per class per day, PRESENT/ABSENT/LATE/EXCUSED |
| Report card generation | ✅ Good | subjectScores, ranking, comportment |
| Comportment tracking | ✅ Good | Punctuality, honesty, obedience |
| Promotion status | ✅ Good | PROMOTED/DEFERRED/REPEATED on report |
| Parent ward linking | ✅ Good | ParentWardLink model |
| Parent portal (scores, reports, attendance) | ✅ Good | Separate parent routes |
| Announcements (targeted) | ✅ Good | By class, targetAudience ALL/TEACHER/PARENT |
| Notifications system | ✅ Good | Multi-channel, priority levels |
| AI track recommendation (JSS3 → SS) | ✅ Excellent | Science/Arts/Commercial — very on-point |
| AI career guidance (SS3) | ✅ Excellent | Cluster-based university/career matching |
| Certificate management | ✅ Good | Signed, verified, reprint tracking |
| Superadmin analytics | ✅ Good | Multi-school overview |
| Teacher rewards/leaderboard | ✅ Unique | Points-based ranking per term |
| Audit log | ✅ Good | All critical actions logged |
| Export (attendance, marks, transcripts) | ✅ Good | Data portability |
| Admission number auto-generation | ✅ Good | Configurable prefix/year/length |
| Student transcript | ✅ Good | Full cross-year history |
| Student lifecycle record | ✅ Good | Suspension, withdrawal tracking |
| Password reset (email-based) | ✅ Good | PasswordResetToken model |

---

### 2.2 Critical Gaps & Issues ❌

#### GAP 1: Class Level Enum is Too Narrow
**Current:** `Class.level` enum: `["JSS1","JSS2","JSS3","SSS1","SSS2","SSS3"]`
**Problem:**
- Setup templates (`setupTemplates.ts`) allow Creche, Nursery 1, Nursery 2, KG, Primary 1–6, JSS1–3, SS1–3 — but the model rejects all of these with a validation error
- `SSS` is wrong — Nigeria uses `SS` not `SSS` (e.g., `SS1` not `SSS1`)
- No support for SS track streams (SS1 Science, SS1 Arts, SS1 Commercial)

**Impact:** Any school trying to set up Nursery/Primary classes will get a 500 error. Admission number would be wrong.

---

#### GAP 2: Class Arm Enum Too Rigid
**Current:** `Class.arm` enum: `["A","B","C"]`
**Problem:**
- Can't create `JSS1 D`, `JSS1 E` for large schools
- Can't create Gold/Silver/Diamond arms used in elite schools
- Only 3 arms maximum

**Impact:** Any school with more than 3 arms per class, or custom arm names, is broken.

---

#### GAP 3: Score Weightings Don't Match Nigerian Standard
**Current Max Scores:**
- classwork: 10, homework: 10, extracurricular: 10, test: 30, exam: 60 → **Total max = 120** (not 100!)

**Nigerian Standard:**
- CA total = 40 marks (combination of 2 tests + assignments)
- Exam = 60 marks
- **Total = 100 marks**

**Impact:** Score totals are mathematically inflated. Report card averages are wrong.

---

#### GAP 4: No Grade Calculation (A1–F9)
**Current:** No grade field on Score or ReportCard subject scores
**Problem:** Nigerian report cards must show letter grades (A1, B2, B3... F9). Every teacher and parent expects this. It's non-negotiable.

**Impact:** Report cards look incomplete / non-Nigerian.

---

#### GAP 5: SS Track / Stream Not Modeled
**Current:** No concept of Science/Arts/Commercial stream in SS classes
**Problem:** A student in `SS1 Science` studies different subjects than `SS1 Arts`. This is fundamental to how Nigerian secondary education works.
The AI recommendation exists but there's nowhere to store or act on the track assignment.

**Impact:** AI recommendation works but its output doesn't actually configure the student's subjects. Feature is orphaned.

---

#### GAP 6: No Subject Code Field
**Current:** Subject has only `name` field
**Problem:** WAEC and NECO require subject codes (e.g., English Language = 101, Mathematics = 110) for exam registration. Schools need to map internal subjects to WAEC codes.

**Impact:** Schools cannot use ReSchool to prepare WAEC registration lists.

---

#### GAP 7: ReportCard Schema Has Field Conflicts
**Current:** `ReportCard.subjectScores[].evaluation` (not in Score model) but Score model uses `extracurricular` instead. Also `classId` is missing from ReportCard — you can't look up a report by class without joining through student.

**Impact:** Report card generation has implicit mapping errors.

---

#### GAP 8: No Timetable / Lesson Planning
**Current:** Zero timetable support
**Problem:** Schools need period-by-period timetables. Teachers need to know when they teach which class. Without this, the teacher dashboard is incomplete.

**Impact:** Teachers use ReSchool but still manage timetables in Excel.

---

#### GAP 9: Fee Management is Underdeveloped
**Current:** Only `isPaid` on Term (basically a SaaS billing gate)
**Problem:** Nigerian schools charge multiple fee types per term. School admin needs:
- Fee definition (tuition, PTA, WAEC levy, etc.)
- Per-student fee payment tracking
- Debt management / defaulter list
- Receipt generation

**Impact:** Schools' bursar cannot work inside ReSchool.

---

#### GAP 10: No Student Photo
**Current:** Student model has no photo field
**Problem:** Student ID cards, report cards, and admission forms all require passport photos in Nigerian schools.

**Impact:** Report cards print without student photos — looks unofficial.

---

#### GAP 11: No PTA / Communication Module
**Current:** Announcements exist but no structured PTA meeting management
**Problem:**
- PTA meetings are scheduled every term
- Minutes need to be kept
- Dues need to be tracked
- Schools want to send formal PTA notices through the system

---

#### GAP 12: House System Not Modeled
**Current:** No house system
**Problem:** Most elite/boarding schools in Nigeria have a house system (4 houses). Students compete inter-house. Sports day, inter-house competitions are major cultural events.

**Impact:** Can't track house points, inter-house competitions, or assign students to houses.

---

#### GAP 13: Medical / Health Records
**Current:** No health record on Student model
**Problem:** Nigerian private schools (especially boarding) must keep:
- Blood group
- Genotype
- Known allergies
- Medical conditions
- Emergency contact (can differ from parent)

**Impact:** Compliance gap for boarding/elite schools.

---

#### GAP 14: WAEC/NECO Registration Workflow Missing
**Current:** Nothing
**Problem:** SS3 students must be registered for WAEC/NECO. Schools need to:
- Generate exam registration numbers
- Track which students registered
- Verify subjects chosen
- Print WAEC form entries

**Impact:** Major workflow happens outside ReSchool every year.

---

#### GAP 15: No `classId` on ReportCard for Direct Querying
**Current:** ReportCard only has `studentId` (to find class, you'd join Student → currentClassId)
**Problem:** Admin querying "all report cards for JSS2A this term" requires an extra lookup that the current architecture doesn't optimize for.

---

### 2.3 Good System-Specific Advantages to Keep 🌟

These are ReSchool-specific features NOT in typical Nigerian school software:

| Feature | Why It's an Edge |
|---|---|
| **AI JSS3 track recommendation** | No Nigerian school software does this. This is a massive differentiator |
| **AI SS3 career cluster matching** | Same — pure competitive edge |
| **Teacher rewards & leaderboard** | Unique gamification — motivates teachers |
| **Audit trail on score changes** | Critical for dispute resolution (very common in Nigerian schools) |
| **Multi-tenant SaaS** | Most Nigerian school software is installed per-school — cloud wins |
| **Comportment tracking on reports** | Best schools track character; this maps perfectly |
| **Certificate digital verification (QR)** | Forward-thinking — very few Nigerian systems have this |
| **Parent portal** | Modern parents (especially Lekki, VI, Abuja) expect digital access |
| **Export to CSV/Excel** | All Nigerian school admins live in Excel |
| **Student lifecycle (suspension/withdrawal)** | Critical for compliance and re-admission tracking |

---

## PART 3: Side-by-Side Comparison

| Dimension | Nigerian Standard | ReSchool Current | Gap? |
|---|---|---|---|
| School levels supported | Creche → SS3 | JSS1–SS3 only | ❌ Critical |
| Class naming | JSS1–JSS3, SS1–SS3 | JSS1–JSS3, SSS1–SSS3 | ❌ Wrong naming |
| Custom arm names | Gold/Silver/Diamond OK | Only A/B/C | ❌ |
| Max arms per class | Unlimited | 3 | ❌ |
| SS stream/track | Science/Arts/Commercial | Not modeled | ❌ |
| Score max | 100 (40 CA + 60 Exam) | 120 (current max) | ❌ Critical |
| Grade display | A1–F9 | Not computed | ❌ |
| 3 terms per year | ✅ Standard | ✅ Implemented | ✅ |
| Term calendar | Sep–Jul | Configurable | ✅ |
| Continuous Assessment | Tests + assignments → 40 | classwork/homework/test → 40 possible but max is wrong | ⚠️ |
| Subject codes (WAEC) | Required | Missing | ❌ |
| Student photo | Standard | Missing | ❌ |
| Report card ranking | Critical culturally | ✅ Implemented | ✅ |
| Comportment on report | Standard | ✅ Implemented | ✅ |
| Prefect tracking | Standard | ✅ isPrefect + prefectTitle | ✅ |
| House system | Many schools | Missing | ❌ |
| Medical/health record | Required (boarding) | Missing | ❌ |
| Fee types (multi) | Multiple per term | Single isPaid gate | ❌ |
| WAEC/NECO registration | Core workflow | Missing | ❌ |
| Timetable | Essential | Missing | ❌ |
| Guidance counsellor role | Mandatory | Not in system | ❌ |
| PTA management | Important | Basic announcements only | ⚠️ |
| AI recommendation | Rare/none in competitors | ✅ Excellent | 🌟 EDGE |
| Teacher reward system | Not standard | ✅ Unique | 🌟 EDGE |
| QR certificate verification | Not common | ✅ Implemented | 🌟 EDGE |
| Audit trail on scores | Not common | ✅ Excellent | 🌟 EDGE |
| Parent portal | Becoming expected | ✅ Good | ✅ |
| Multi-tenant cloud SaaS | Rare | ✅ Architecture | 🌟 EDGE |

---

## PART 4: Prioritized Recommendations

### TIER 1 — Critical (Breaks Core Functionality)
1. **Fix Class model**: Remove enum on `level` (make it free text or a much broader list), remove enum on `arm` (make it free text)
2. **Fix score max to 100**: Adjust CA breakdown — `firstCA` (20) + `secondCA` (20) + `exam` (60) = 100
3. **Add grade field to Score**: Compute A1–F9 from total automatically
4. **Fix class naming**: `SSS1` → `SS1`, `SSS2` → `SS2`, `SSS3` → `SS3`

### TIER 2 — High Value (Directly affects school operations)
5. **Add student photo URL** to Student model
6. **Add `classId` to ReportCard** for efficient querying
7. **Add SS stream/track** to Student model (`scienceTrack: "SCIENCE" | "ARTS" | "COMMERCIAL" | null`)
8. **Add subject code** to Subject model (for WAEC registration)
9. **Fee ledger model** — StudentFee with multiple fee types, payment records, balance
10. **Medical record** on Student — blood group, genotype, allergies

### TIER 3 — Competitive Edge (Makes ReSchool best-in-class)
11. **Timetable module** — period-based, teacher/class schedule
12. **WAEC/NECO registration export** — generate exam entry forms
13. **House system** — house assignment for students, inter-house competition
14. **Guidance counsellor role** — separate from teacher, access to AI recommendations
15. **PTA meeting module** — schedule, minutes, dues tracking

---

## PART 5: Quick Wins (Low Code, High Impact)

These can be done in 1–2 hours each:

| Fix | Files to Change | Impact |
|---|---|---|
| Change `SSS1/2/3` → `SS1/2/3` in Class enum & setupTemplates | `Class.ts`, `setupTemplates.ts`, `initialize/route.ts` | Matches national standard |
| Broaden Class level enum to include Primary + Pre-school | `Class.ts` | Opens market to primary schools |
| Remove arm enum restriction (free string) | `Class.ts` | Removes 3-arm limit |
| Fix score max: CA=40, Exam=60 | `Score.ts` pre-save hook + docs | Correct 100-point scale |
| Auto-compute grade (A1–F9) on Score save | `Score.ts` pre-save hook | Report cards show grades |
| Add `photoUrl` to Student model | `Students.ts` | Student ID cards / reports |
| Add `waecCode` to Subject model | `Subject.ts` | WAEC prep |
| Add `track` to Student model | `Students.ts` | Connects AI recommendation to student profile |
| Add `classId` index to ReportCard | `ReportCard.ts` | Faster class-based report queries |

---

*Review complete. Awaiting your direction on which items to implement.*
