# AI Features - Code Location Guide

This document shows exactly which parts of the codebase handle AI features.

---

## 🤖 **AI Features Overview**

The application uses **OpenAI GPT-4o-mini** for three main AI features:
1. **AI Chat** - Quick question/answer chat interface
2. **AI Question Threads** - Persistent conversation threads with context
3. **AI Recommendations** - Personalized study recommendations

---

## 📁 **AI-Related Files**

### **1. Frontend Pages**

#### **`/app/chat/page.tsx`**
- **Purpose**: Server component wrapper for chat page
- **What it does**: Renders the chat interface

#### **`/app/chat/ChatClient.tsx`**
- **Purpose**: Main chat interface component
- **What it does**:
  - Displays chat messages
  - Handles user input
  - Calls `/api/v1/ai/messages` endpoint
  - Manages conversation state
  - Shows loading states and errors

**Key Features:**
- Real-time message display
- Subject context (optional)
- Auto-scrolling message list
- Enter to send, Shift+Enter for new line

---

### **2. API Routes (Backend)**

All AI API routes are located in `/app/api/v1/ai/`

#### **A. Quick Chat Messages**
**File**: `/app/api/v1/ai/messages/route.ts`
- **Endpoint**: `POST /api/v1/ai/messages`
- **Purpose**: Quick AI chat without saving to database
- **What it does**:
  1. Authenticates user
  2. Takes message and optional subjectId/topicId
  3. Calls OpenAI GPT-4o-mini
  4. Returns AI response immediately
  5. **Does NOT save conversation** (stateless)

**OpenAI Configuration:**
- Model: `gpt-4o-mini`
- Max tokens: 500
- Temperature: 0.5
- System prompt: "You are StudyBuddy AI. Always provide explanations that are clear, concise, and tailored to secondary school students."

---

#### **B. Question Threads (Persistent Conversations)**

**File**: `/app/api/v1/ai/questions/create/route.ts`
- **Endpoint**: `POST /api/v1/ai/questions/create`
- **Purpose**: Create a new question thread
- **What it does**:
  1. Creates `AiQuestion` record in database
  2. Saves user's question as `AiQuestionMessage`
  3. Calls OpenAI to generate response
  4. Saves AI response as `AiQuestionMessage`
  5. Returns thread with both messages

**Database Models Used:**
- `AiQuestion` - The conversation thread
- `AiQuestionMessage` - Individual messages (user or AI)

---

**File**: `/app/api/v1/ai/questions/[id]/reply/route.ts`
- **Endpoint**: `POST /api/v1/ai/questions/[id]/reply`
- **Purpose**: Continue an existing conversation thread
- **What it does**:
  1. Validates thread ownership
  2. Loads all previous messages from database
  3. Builds conversation context for OpenAI
  4. Calls OpenAI with full conversation history
  5. Saves new user message and AI response
  6. Returns both messages

**Key Feature**: Maintains conversation context across multiple messages

---

**File**: `/app/api/v1/ai/questions/list/route.ts`
- **Endpoint**: `GET /api/v1/ai/questions/list`
- **Purpose**: List user's question threads
- **What it does**:
  1. Fetches all `AiQuestion` records for user
  2. Includes last message from each thread
  3. Returns paginated list
  4. Supports `?page=1&pageSize=20` query params

---

#### **C. AI Recommendations**

**File**: `/app/api/v1/ai/recommendations/route.ts`
- **Endpoints**: 
  - `GET /api/v1/ai/recommendations` - Get recommendations (auto-generates if needed)
  - `POST /api/v1/ai/recommendations` - Manually generate recommendation

**GET Endpoint** (Auto-generate):
- Checks for recent recommendations (last 23 hours)
- If none exist, generates up to 2 new recommendations
- Analyzes user's progress across all subjects
- Creates personalized prompts based on weakest subjects
- Calls OpenAI to generate recommendations
- Saves to database
- Returns recommendations

**POST Endpoint** (Manual):
- Takes optional subjectId, topicId, and context
- Generates single recommendation
- Saves to database
- Returns recommendation

**Rate Limiting:**
- Maximum 2 recommendations per user per 24 hours
- Uses `FRESH_WINDOW_MS = 23 * 60 * 60 * 1000` (23 hours)

**OpenAI Configuration:**
- Model: `gpt-4o-mini`
- Max tokens: 300
- Temperature: 0.4 (more focused/consistent)

---

**File**: `/app/api/v1/ai/recommendations/cron/route.ts`
- **Endpoint**: `POST /api/v1/ai/recommendations/cron`
- **Purpose**: Scheduled job to generate recommendations for all users
- **What it does**:
  1. Requires secret header (`x-cron-secret`) for security
  2. Loops through all users
  3. Skips users with recent recommendations
  4. Generates recommendation for each user
  5. Saves to database
  6. Returns summary (created, skipped, errors)

**Security**: Protected by `RECOMMENDATIONS_CRON_SECRET` environment variable

---

### **3. Database Models (Prisma Schema)**

**File**: `/prisma/schema.prisma`

#### **`AiQuestion` Model** (Lines 151-164)
```prisma
model AiQuestion {
  id           String   @id @default(uuid())
  userId       String
  subjectId    String?
  topicId      String?
  questionText String
  createdAt    DateTime @default(now())

  user    User     @relation(...)
  subject Subject? @relation(...)
  topic   Topic?   @relation(...)
  messages AiQuestionMessage[]
}
```
- Stores conversation threads
- Links to user, optional subject/topic for context

#### **`AiQuestionMessage` Model** (Lines 166-174)
```prisma
model AiQuestionMessage {
  id           String   @id @default(uuid())
  aiQuestionId String
  sender       Sender   // enum: "user" | "ai"
  message      String
  createdAt    DateTime @default(now())

  aiQuestion AiQuestion @relation(...)
}
```
- Stores individual messages in a thread
- Tracks sender (user or AI)

#### **`Recommendation` Model** (Lines 222-233)
```prisma
model Recommendation {
  id                 String   @id @default(uuid())
  userId             String
  subjectId          String?
  topicId            String?
  recommendationText String
  createdAt          DateTime @default(now())

  user    User     @relation(...)
  subject Subject? @relation(...)
  topic   Topic?   @relation(...)
}
```
- Stores AI-generated study recommendations
- Can be linked to specific subject/topic

---

### **4. Component Library**

**File**: `/components/ChatMessage.tsx`
- **Purpose**: Displays individual chat message
- **Used by**: Chat interface

**File**: `/components/ChatMessageContainer.tsx`
- **Purpose**: Container for multiple chat messages
- **What it does**: Renders list of messages with proper styling

---

## 🔑 **Environment Variables**

Required for AI features:

```env
OPENAI_API_KEY="sk-your-api-key-here"
```

Optional (for scheduled recommendations):
```env
RECOMMENDATIONS_CRON_SECRET="your-secret-key"
```

---

## 🔄 **How AI Features Work Together**

### **Quick Chat Flow** (`/chat` page)
```
User types message
  ↓
ChatClient.tsx calls POST /api/v1/ai/messages
  ↓
API calls OpenAI GPT-4o-mini
  ↓
Returns response immediately
  ↓
Displays in chat interface
```
**Note**: This is stateless - no database storage

---

### **Question Thread Flow**
```
User creates question
  ↓
POST /api/v1/ai/questions/create
  ↓
Creates AiQuestion + saves user message
  ↓
Calls OpenAI
  ↓
Saves AI response
  ↓
Returns thread with messages

User continues conversation
  ↓
POST /api/v1/ai/questions/[id]/reply
  ↓
Loads all previous messages
  ↓
Calls OpenAI with full context
  ↓
Saves new messages
  ↓
Returns updated thread
```
**Note**: This maintains conversation history in database

---

### **Recommendations Flow**
```
User visits dashboard
  ↓
Dashboard fetches GET /api/v1/ai/recommendations
  ↓
API checks for recent recommendations
  ↓
If none exist:
  - Analyzes user progress
  - Generates prompts for weak subjects
  - Calls OpenAI (up to 2 recommendations)
  - Saves to database
  ↓
Returns recommendations
  ↓
Displayed on dashboard
```

---

## 📊 **OpenAI Usage Summary**

### **Models Used**
- **GPT-4o-mini** (all features)
  - Cost-effective
  - Good for educational content
  - Fast responses

### **Configuration by Feature**

| Feature | Model | Max Tokens | Temperature | Purpose |
|---------|-------|------------|-------------|---------|
| Quick Chat | gpt-4o-mini | 500 | 0.5 | Balanced responses |
| Question Threads | gpt-4o-mini | 500 | 0.5 | Educational explanations |
| Recommendations | gpt-4o-mini | 300 | 0.4 | Concise, actionable advice |

### **System Prompts**

**Chat/Questions:**
```
"You are StudyBuddy AI. 
Always provide explanations that are clear, concise, and tailored to secondary school students.
If subject/topic hints are given, adjust difficulty level accordingly."
```

**Recommendations:**
```
"You are StudyBuddy AI. 
Generate clear, practical study recommendations for a secondary-school student.
Make it specific, actionable, and tied to the subject(s)."
```

---

## 🎯 **Where AI is Used in Frontend**

1. **`/chat`** - Main AI chat interface
2. **`/dashboard`** - Displays AI recommendations
3. **Future**: Could be integrated into:
   - Question explanation pages
   - Mock exam review
   - Progress insights

---

## 🔍 **Key Code Patterns**

### **OpenAI Client Initialization**
```typescript
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
```

### **Standard OpenAI Call**
```typescript
const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  max_tokens: 500,
  temperature: 0.5,
});

const aiText = completion.choices?.[0]?.message?.content || "Default response";
```

### **Error Handling**
All AI endpoints wrap OpenAI calls in try-catch blocks and return appropriate error responses if the API call fails.

---

## 📝 **Summary**

**AI Features Code Locations:**
- ✅ Frontend: `/app/chat/` (2 files)
- ✅ API Routes: `/app/api/v1/ai/` (6 route files)
- ✅ Database: `prisma/schema.prisma` (3 models)
- ✅ Components: `/components/ChatMessage*.tsx` (2 files)
- ✅ Configuration: `.env` (OPENAI_API_KEY)

**Total AI-Related Files**: ~11 files

All AI functionality is centralized in these locations, making it easy to:
- Modify AI prompts
- Change OpenAI models
- Add new AI features
- Debug AI issues

