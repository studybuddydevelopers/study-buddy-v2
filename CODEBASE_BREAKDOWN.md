# Study Buddy v2 - Complete Codebase Breakdown

## 🎯 **What This Application Does**

**Study Buddy v2** is a comprehensive educational platform designed for secondary school students preparing for WAEC (West African Examinations Council) exams. It provides:

- **Practice Questions**: Access to past WAEC questions with explanations
- **Mock Exams**: Timed practice exams with automatic grading
- **AI-Powered Learning**: Chat with an AI tutor for personalized help
- **Progress Tracking**: Monitor performance across subjects and topics
- **Personalized Recommendations**: AI-generated study suggestions based on performance
- **Subscription Management**: Freemium model with premium features
- **B2B Features**: School management for bulk student accounts

---

## 🏗️ **Architecture Overview**

### **Tech Stack**
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Tailwind CSS
- **Deployment**: Next.js (server-side rendering)

### **Key Design Patterns**
- **Server Components**: Most pages are server components for SEO and performance
- **API Routes**: RESTful API structure under `/app/api/v1/`
- **Middleware**: Route protection and authentication checks
- **Component Library**: Reusable UI components in `/components`

---

## 📁 **Project Structure**

```
study-buddy-v2/
├── app/                          # Next.js App Router pages
│   ├── api/v1/                   # REST API endpoints
│   ├── dashboard/               # User dashboard
│   ├── exams/                    # Mock exam interface
│   ├── chat/                     # AI chat interface
│   ├── login/                    # Authentication pages
│   └── ...
├── components/                    # Reusable UI components
├── lib/                          # Utility libraries
├── prisma/                       # Database schema & migrations
├── public/                       # Static assets
└── demo/                         # Component demos
```

---

## 🔐 **Authentication System**

### **How It Works**
1. **Supabase Auth**: Handles user authentication (email/phone + password)
2. **Prisma Sync**: Creates corresponding user record in PostgreSQL
3. **Cookie-Based Sessions**: Uses Supabase SSR for cookie management
4. **Middleware Protection**: Automatically redirects unauthenticated users

### **Key Files**
- `middleware.ts`: Route protection logic
- `lib/auth.ts`: `requireUser()` and `requireAdmin()` helpers
- `app/api/v1/signup/route.ts`: User registration
- `app/api/v1/login/route.ts`: User login
- `app/api/v1/logout/route.ts`: User logout

### **Protected Routes**
- `/dashboard`, `/exams`, `/chat`, `/profile` require authentication
- `/login`, `/sign-up` redirect if already logged in

---

## 🗄️ **Database Schema (Prisma)**

### **Core Models**

#### **User & Profile**
- `User`: Base user record (linked to Supabase auth)
- `UserProfile`: Extended profile (name, phone, grade, preferred subjects)
- `AdminUser`: Admin role management

#### **Content Structure**
- `Subject`: Academic subjects (Math, English, etc.)
- `Topic`: Topics within subjects
- `PastQuestion`: WAEC past questions with answers and explanations

#### **Learning Features**
- `PastQuestionAttempt`: Tracks user answers to practice questions
- `MockExamTemplate`: Exam templates (subject, question count)
- `MockExamInstance`: User's exam session
- `MockExamAnswer`: Answers for each question in an exam

#### **AI Features**
- `AiQuestion`: User's question thread
- `AiQuestionMessage`: Messages in the conversation (user/AI)

#### **Progress & Recommendations**
- `ProgressTrack`: Subject-wise progress percentage
- `Recommendation`: AI-generated study recommendations

#### **Business Features**
- `Subscription`: User subscription plans (free/premium)
- `Transaction`: Payment logs
- `School`: B2B school accounts
- `SchoolStudent`: Links students to schools

---

## 🛣️ **API Endpoints**

### **Authentication (`/api/v1/`)**
- `POST /signup` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /me` - Get current user profile

### **User Profile (`/api/v1/profile/`)**
- `GET /profile` - Get user profile
- `PATCH /profile` - Update profile

### **Subjects & Topics (`/api/v1/subjects/`, `/api/v1/topics/`)**
- `GET /subjects/list` - List all subjects
- `GET /subjects/[id]` - Get subject details
- `POST /admin/subjects/create` - Create subject (admin)
- `POST /admin/topics/create` - Create topic (admin)

### **Past Questions (`/api/v1/past-questions/`)**
- `GET /past-questions/query` - Search/filter questions
- `GET /past-questions/explanation/[id]` - Get question explanation
- `POST /past-questions/attempt` - Submit answer attempt

### **Mock Exams (`/api/v1/mock-exams/`)**
- `GET /mock-exam-templates` - List available exam templates
- `POST /start` - Start a new mock exam
- `GET /instance` - Get exam instance details
- `POST /save-progress` - Save answers during exam
- `POST /submit` - Submit completed exam
- `POST /grade` - Grade submitted exam

### **AI Features (`/api/v1/ai/`)**
- `POST /questions/create` - Ask a new question
- `GET /questions/list` - List user's questions
- `GET /questions/[id]` - Get question thread
- `POST /questions/[id]/reply` - Continue conversation
- `POST /messages` - Quick AI chat message
- `GET /recommendations` - Get personalized recommendations
- `POST /recommendations` - Generate new recommendation

### **Progress Tracking (`/api/v1/progress/`)**
- `GET /full-report` - Complete progress report
- `GET /subject/[subjectId]` - Subject-specific progress
- `POST /update` - Update progress (usually automatic)

### **Subscriptions (`/api/v1/subscriptions/`)**
- `GET /list` - List user subscriptions
- `GET /[id]` - Get subscription details

### **Payments (`/api/v1/payments/`)**
- `POST /verify` - Verify payment transaction
- `POST /webhook` - Payment webhook handler

### **Admin (`/api/v1/admin/`)**
- `POST /past-questions/upload` - Upload questions (CSV/JSON)
- `POST /past-questions/batch` - Batch upload
- `POST /curriculum/upload` - Upload curriculum files
- `GET /users/query` - Query users

### **Schools (`/api/v1/schools/`)**
- `POST /create` - Create school (B2B)
- `GET /list` - List schools
- `GET /[id]` - Get school details

---

## 🎨 **Frontend Pages**

### **Public Pages**
- `/` - Landing page
- `/about-us` - About page
- `/contact-us` - Contact page
- `/terms-of-service` - Terms
- `/privacy-policy` - Privacy policy
- `/demo-showcase` - Component demos

### **Authentication Pages**
- `/login` - Login form
- `/sign-up` - Registration form
- `/forgot-password` - Password reset request
- `/reset-password/update` - Password reset form
- `/check-email` - Email verification prompt
- `/verify-email` - Email verification handler
- `/already-logged-in` - Redirect page for logged-in users
- `/unauthorized` - Access denied page

### **Protected Pages**
- `/dashboard` - Main user dashboard with:
  - User profile summary
  - Progress overview
  - AI recommendations
  - Quick actions
- `/exams` - Mock exams interface:
  - List available exams
  - Start new exam
  - View exam history
- `/exams/[instanceId]` - Active exam interface:
  - Question display
  - Answer input
  - Timer
  - Submit functionality
- `/chat` - AI chat interface:
  - Conversation history
  - Subject/topic context
  - Real-time AI responses

---

## 🧩 **Component Library**

Located in `/components/`, these are reusable UI components:

### **Typography**
- `Heading1` through `Heading6` - Heading components
- `Paragraph` - Text paragraphs
- `Caption`, `Small` - Small text variants

### **Form Components**
- `TextField` - Text input
- `SelectField` - Dropdown select
- `MultiSelectField` - Multi-select with cards
- `Button` - Button component

### **Display Components**
- `Card` - Card container
- `Badge` - Status badges
- `Table` - Data table
- `ProgressBar` - Progress indicator
- `Image` - Optimized image

### **Chat Components**
- `ChatMessage` - Individual message
- `ChatMessageContainer` - Message list

### **Layout Components**
- `NavBar` - Navigation bar
- `Footer` - Page footer
- `Logo`, `LogoIcon`, `LogoName` - Branding

---

## 🤖 **AI Integration**

### **OpenAI Usage**
The app uses **GPT-4o-mini** for:
1. **Educational Chat**: Answers student questions with context
2. **Recommendations**: Generates personalized study suggestions
3. **Explanations**: Provides detailed explanations for exam questions

### **AI Features**

#### **1. Question Threading**
- Users create a question thread (`AiQuestion`)
- Messages stored as `AiQuestionMessage`
- Maintains conversation context
- Can link to subject/topic for better context

#### **2. Quick Chat**
- Simple message/response without threading
- Good for quick questions

#### **3. Recommendations**
- Analyzes user's:
  - Past question attempts
  - Mock exam scores
  - Progress by subject
- Generates personalized study recommendations
- Rate-limited (2 per 24 hours per user)

### **Configuration**
- API key: `OPENAI_API_KEY` in `.env`
- Model: `gpt-4o-mini` (cost-effective)
- Temperature: 0.4-0.5 (balanced creativity/accuracy)

---

## 📊 **Progress Tracking System**

### **How It Works**
1. **Automatic Updates**: Progress updated when:
   - User attempts past questions
   - User completes mock exams
   - User follows recommendations

2. **Subject-Based**: Each subject has a `ProgressTrack` record
   - `progressPercentage`: 0-100%
   - Updated based on:
     - Questions attempted vs. total
     - Correct answer rate
     - Mock exam performance

3. **Full Report**: Dashboard shows:
   - Overall progress
   - Subject breakdown
   - Weak areas
   - Strong areas

---

## 💳 **Subscription & Payments**

### **Subscription Plans**
- **Free**: Basic features
- **Premium**: Full access (future feature)

### **Payment Flow**
1. User upgrades subscription
2. Payment processed (Flutterwave/Paystack)
3. Transaction logged in `Transaction` table
4. Subscription status updated
5. Webhook verifies payment

### **Models**
- `Subscription`: User's current plan
- `Transaction`: Payment history

---

## 🏫 **B2B School Features**

### **Purpose**
Allows schools to:
- Manage student accounts in bulk
- Provide premium subscriptions to students
- Track school-wide performance

### **Models**
- `School`: School information
- `SchoolStudent`: Links students to schools

---

## 🔧 **Key Utilities**

### **`lib/auth.ts`**
- `requireUser()`: Ensures user is authenticated
- `requireAdmin()`: Ensures user is admin
- Returns user data or error response

### **`lib/prisma.ts`**
- Singleton Prisma client
- Prevents multiple instances in development

### **`lib/supabaseClient.ts`**
- Browser-side Supabase client
- For client components

### **`lib/getSession.ts`**
- Server-side session helper
- Gets current authenticated user

---

## 🎨 **Styling System**

### **Tailwind CSS**
- Custom color system with CSS variables
- Primary, Secondary, Accent palettes
- Semantic colors (success, warning, error, info)
- Responsive design utilities

### **CSS Variables**
Defined in `globals.css`:
- `--background`, `--foreground`
- `--primary-*` (50-900 shades)
- `--secondary-*` (50-900 shades)
- `--accent-*` (50-900 shades)
- `--success`, `--warning`, `--error`, `--info`

---

## 🚀 **Development Workflow**

### **Running the App**
1. Install dependencies: `npm install`
2. Set up `.env` file with:
   - Database URL
   - Supabase credentials
   - OpenAI API key
3. Run migrations: `npx prisma migrate dev`
4. (Optional) Seed database: `npx prisma db seed`
5. Start dev server: `npm run dev`

### **Database Management**
- **Migrations**: `npx prisma migrate dev`
- **Generate Client**: `npx prisma generate`
- **Studio**: `npx prisma studio` (GUI)
- **Seed**: `npx prisma db seed`

### **Scripts**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint check

---

## 📝 **Key Features Summary**

### **For Students**
✅ Practice past WAEC questions  
✅ Take timed mock exams  
✅ Get AI-powered explanations  
✅ Track progress by subject  
✅ Receive personalized recommendations  
✅ Chat with AI tutor  

### **For Admins**
✅ Upload past questions (CSV/JSON)  
✅ Create subjects and topics  
✅ Manage curriculum files  
✅ Query user data  

### **For Schools (B2B)**
✅ Create school accounts  
✅ Manage student subscriptions  
✅ Track school performance  

---

## 🔒 **Security Features**

1. **Authentication**: Supabase handles secure auth
2. **Route Protection**: Middleware protects routes
3. **API Security**: All API routes check authentication
4. **Admin Routes**: Separate `requireAdmin()` check
5. **Environment Variables**: Sensitive data in `.env`
6. **Cookie Management**: Secure cookie handling via Supabase SSR

---

## 🎯 **Future Enhancements (Based on Schema)**

The schema supports but may not be fully implemented:
- Payment webhooks
- Advanced recommendation algorithms
- School analytics dashboard
- Curriculum file management
- Batch question uploads

---

## 📚 **File Organization Best Practices**

- **Server Components**: Default for pages (SEO, performance)
- **Client Components**: Only when needed (interactivity, hooks)
- **API Routes**: RESTful structure under `/api/v1/`
- **Components**: Reusable, typed, documented
- **Lib**: Pure utility functions
- **Types**: Shared TypeScript types

---

This codebase is a **production-ready educational platform** with a solid architecture, comprehensive features, and room for growth. The separation of concerns, type safety, and modular design make it maintainable and scalable.

