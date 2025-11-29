Perfect — **this schema is correct**, consistent, relationally sound, AND suitable for an enterprise-level educational platform.

Now I will give you the **complete API architecture plan** for Study Buddy based on your final schema — this will map directly to:
✔️ your frontend pages
✔️ Next.js `/app/api/...` route structure
✔️ prisma-powered backend logic
✔️ Phase 1 + Phase 2 + future features

This is a **ready-to-build blueprint** for all the features.

---

# 🚀 **Study Buddy — Complete API Architecture Plan**

(Aligned with your Prisma schema & MVP → Phase 2 requirements)

The platform has **12 major API domains**:

1. **Auth**
2. **User profiles**
3. **Subjects & Topics**
4. **Past questions**
5. **Past question attempts**
6. **AI Q&A**
7. **Mock exams**
8. **Recommendations**
9. **Progress tracking**
10. **Subscriptions & Payments**
11. **Admin content upload**
12. **Schools (B2B)**

---

# 1️⃣ AUTH API

(Handled by Supabase, but you create wrappers like `/api/v1/login`, `/api/v1/signup`, `/api/logout`)

### **Routes**

```
POST /api/v1/signup
POST /api/v1/login
POST /api/logout
GET  /api/me
```

### **Responsibilities**

* Sign up users with Supabase + metadata
* Login using email/phone
* Logout & clear session cookies
* Fetch current authenticated user

---

# 2️⃣ USER PROFILE API

Connected to `UserProfile` model.

### **Routes**

```
GET    /api/profile
PATCH  /api/profile
```

### **Responsibilities**

* Get the current user's profile
* Update personal info (name, grade, avatar, preferredSubjects)

---

# 3️⃣ SUBJECTS & TOPICS API

Connected to `Subject` and `Topic`.

### **Routes**

```
GET /api/subjects
GET /api/subjects/:id
GET /api/subjects/:id/topics
```

### **Responsibilities**

* List subjects for homepage
* Fetch full subject data
* Fetch topics under a subject

---

# 4️⃣ PAST QUESTIONS API

Connected to `PastQuestion`.

### **Routes**

```
GET /api/questions
GET /api/questions/:id
GET /api/questions/by-subject/:subjectId
GET /api/questions/by-topic/:topicId
```

### **Responsibilities**

* Display practice questions
* Provide detailed explanations
* Used by mock exam generator

---

# 5️⃣ USER ATTEMPTS API

Connected to `PastQuestionAttempt`.

### **Routes**

```
POST /api/attempts
GET  /api/attempts/recent
GET  /api/attempts/by-subject/:subjectId
```

### **Responsibilities**

* Save each attempt
* Score correctness
* Track time spent
* Feed AI personalization engine

---

# 6️⃣ AI Q&A API

Connected to `AiQuestion`, `AiQuestionMessage`.

### **Routes**

```
POST /api/ai/ask
GET  /api/ai/history
GET  /api/ai/:questionId
POST /api/ai/:questionId/reply
```

### **Responsibilities**

* Save user question
* Call Gemini API
* Save AI response
* Maintain multi-message conversation threads

---

# 7️⃣ MOCK EXAM SYSTEM API

Connected to:

* `MockExamTemplate`
* `MockExamInstance`
* `MockExamAnswer`

### **Routes**

#### 📌 Templates (Admin / Public)

```
GET /api/mock/templates
GET /api/mock/templates/:id
```

#### 📌 User exam flow

```
POST /api/mock/start
GET  /api/mock/:instanceId
POST /api/mock/:instanceId/submit
```

### **Flow**

1. User selects subject
2. System generates random questions
3. Saves instance
4. User answers
5. AI can explain
6. Score stored → affects recommendations

---

# 8️⃣ AI RECOMMENDATIONS API

Connected to `Recommendation`.

### **Routes**

```
GET  /api/recommendations
POST /api/recommendations/generate
```

### **Responsibilities**

* Show personalized learning suggestions
* Use:

  * attempts history
  * mock exam scores
  * subjects user is weak in

---

# 9️⃣ PROGRESS TRACKING API

Connected to `ProgressTrack`.

### **Routes**

```
GET /api/progress
POST /api/progress/update
```

### **Logic:**

Progress is updated based on:

* % of questions attempted
* mock exam performance
* AI recommendation follow-through

---

# 🔟 SUBSCRIPTIONS & PAYMENTS API

Connected to:

* `Subscription`
* `Transaction`

### **Routes**

```
GET  /api/subscription
POST /api/subscription/upgrade
POST /api/subscription/cancel

POST /api/payments/verify
POST /api/payments/webhook
```

### **Responsibilities**

* Freemium → premium transitions
* Flutterwave/Paystack transaction verification
* Save all payments in `Transaction`

---

# 1️⃣1️⃣ ADMIN CONTENT MGMT API

Connected to:

* `CurriculumFile`
* `PastQuestionSource`
* `AdminUser`

### **Routes**

```
POST /api/admin/upload-curriculum
POST /api/admin/upload-past-questions
GET  /api/admin/users
```

---

# 1️⃣2️⃣ SCHOOL / B2B API

Connected to:

* `School`
* `SchoolStudent`

### **Routes**

```
POST /api/schools
GET  /api/schools/:id
POST /api/schools/:id/add-student
GET  /api/schools/:id/students
```

### **B2B Features**

* Schools manage student accounts
* Bulk premium subscriptions

---

# 🔥 **FINAL ARCHITECTURE MAP (VISUAL)**

This is the mental map of your API:

```
/api
 ├── auth
 │    ├── login
 │    ├── signup
 │    ├── logout
 │    └── me
 │
 ├── profile
 │
 ├── subjects
 │    └── [id]
 │
 ├── topics
 │
 ├── questions
 │    ├── by-subject/[subjectId]
 │    ├── by-topic/[topicId]
 │    └── [id]
 │
 ├── attempts
 │
 ├── ai
 │    ├── ask
 │    ├── history
 │    └── [questionId]/reply
 │
 ├── mock
 │    ├── templates
 │    ├── start
 │    └── [instanceId]
 │
 ├── recommendations
 │
 ├── progress
 │
 ├── subscription
 │
 ├── payments
 │
 ├── admin
 │
 └── schools
```

---

# 🎁 Want the NEXT step?

I can generate:

### ✅ Full folder tree for `/app/api/...`

### ✅ Every API route fully implemented (actual TS code)

### ✅ Service layer (clean architecture)

### ✅ A full README of the backend architecture

### ✅ A Postman collection for all endpoints

Just tell me:

**Do you want the full API implementation next?**
