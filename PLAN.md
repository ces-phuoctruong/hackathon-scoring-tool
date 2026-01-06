# Internship Test Scoring Tool - Implementation Documentation

## Project Overview

**Problem**: Inconsistent scoring of internship written tests due to subjective human evaluation

**Solution**: AI-assisted scoring tool using Claude's vision + analysis capabilities

**Impact**: Faster, fairer, more consistent candidate evaluation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (via Docker)
- **AI**: Anthropic Claude API (Vision + Extended Thinking)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (Vite)                   │
│  - HomePage       - SchemaBuilderPage                   │
│  - UploadPage     - ReviewPage                          │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                Node.js Backend (Express)                 │
│  - /api/schemas   - /api/tests                          │
│  - File upload    - Claude integration                  │
└──────┬───────────────┬──────────────────────────────────┘
       │               │
┌──────▼─────┐  ┌─────▼──────┐
│  MongoDB   │  │   Claude   │
│  - Schemas │  │    API     │
│  - Results │  │ - Vision   │
└────────────┘  │ - Thinking │
                └────────────┘
```

## Project Structure

```
hackathon-scoring-tool/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.ts          # Environment configuration
│   │   │   ├── database.ts       # MongoDB connection
│   │   │   └── upload.ts         # Multer file upload config
│   │   ├── models/
│   │   │   ├── index.ts
│   │   │   ├── scoring-schema.model.ts
│   │   │   └── test-result.model.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── schema.routes.ts
│   │   │   └── test.routes.ts
│   │   ├── services/
│   │   │   ├── index.ts
│   │   │   ├── claude-vision.service.ts
│   │   │   └── scoring.service.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── SchemaBuilder.tsx
│   │   │   ├── SchemaList.tsx
│   │   │   └── FileUpload.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── SchemaBuilderPage.tsx
│   │   │   ├── UploadPage.tsx
│   │   │   └── ReviewPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── docker-compose.yml
├── .gitignore
├── CLAUDE.md
├── PLAN.md
└── README.md
```

---

## Phase 1: Project Setup (COMPLETED)

### Backend Setup
- Express server with TypeScript
- MongoDB connection via Mongoose
- Environment configuration with dotenv
- CORS enabled for frontend communication

### Frontend Setup
- Vite + React + TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- Proxy configuration to backend

### Infrastructure
- Docker Compose for MongoDB
- .gitignore for common exclusions
- ESLint configuration

---

## Phase 2: Scoring Schema Builder (COMPLETED)

### Data Model: ScoringSchema

```typescript
interface IQuestion {
  questionNumber: number;
  questionText: string;
  maxPoints: number;
  evaluationCriteria: string;
  sampleAnswer?: string;
}

interface IScoringSchema {
  name: string;
  version: string;
  description?: string;
  questions: IQuestion[];
  rubricGuidelines: {
    fullCredit: string;
    partialCredit: string;
    noCredit: string;
  };
  totalPoints: number;  // Auto-calculated
  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/schemas | List all schemas |
| GET | /api/schemas/:id | Get schema by ID |
| POST | /api/schemas | Create new schema |
| PUT | /api/schemas/:id | Update schema |
| DELETE | /api/schemas/:id | Delete schema |

### Frontend Components

- **SchemaBuilder.tsx**: Dynamic form for creating/editing schemas
  - Add/remove questions dynamically
  - Rubric guidelines editor
  - Client-side validation

- **SchemaList.tsx**: Table view of all schemas
  - Edit/Delete actions
  - Sortable by date

- **SchemaBuilderPage.tsx**: Page component managing list/create/edit views

---

## Phase 3: Image Upload & Processing (COMPLETED)

### Data Model: TestResult

```typescript
interface ITestResult {
  schemaId: ObjectId;
  candidateName?: string;
  originalImages: string[];
  extractedText: string;
  extractedAnswers: {
    questionNumber: number;
    studentAnswer: string;
  }[];
  scores: IQuestionScore[];
  totalScore: number;
  maxScore: number;
  status: 'pending' | 'processing' | 'extracted' | 'scored' | 'reviewed';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}
```

### File Upload Configuration

- Multer for multipart/form-data handling
- Accepts: JPG, PNG, WebP, PDF
- Max file size: 10MB
- Max files per upload: 10

### Claude Vision Service

```typescript
// backend/src/services/claude-vision.service.ts

async function extractTextFromImage(imagePath: string): Promise<ExtractedContent> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64Image }
        },
        {
          type: 'text',
          text: `Extract all text from this test paper...
                 Return JSON: { rawText, questions: [{ questionNumber, studentAnswer }] }`
        }
      ]
    }]
  });

  return JSON.parse(response.content[0].text);
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tests/upload | Upload images + create test record |
| POST | /api/tests/:id/process | Extract text via Claude Vision |

### Frontend Components

- **FileUpload.tsx**: Drag-and-drop file upload component
  - File type validation
  - Preview thumbnails
  - Add/remove files

- **UploadPage.tsx**: 4-step wizard
  1. Select Schema
  2. Upload Files
  3. Processing (with spinner)
  4. Complete (extracted text preview)

---

## Phase 4: AI Scoring Engine (COMPLETED)

### Scoring Service with Extended Thinking

```typescript
// backend/src/services/scoring.service.ts

async function scoreAnswer(
  question: IQuestion,
  studentAnswer: string,
  rubricGuidelines: RubricGuidelines
): Promise<ScoringResult> {

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: 10000,
    },
    messages: [{
      role: 'user',
      content: buildScoringPrompt(question, studentAnswer, rubricGuidelines)
    }]
  });

  // Extract thinking (reasoning) and text (score) blocks
  const thinking = response.content.find(b => b.type === 'thinking');
  const text = response.content.find(b => b.type === 'text');

  return {
    questionNumber: question.questionNumber,
    points: parsed.points,
    maxPoints: question.maxPoints,
    feedback: parsed.feedback,
    reasoning: thinking?.thinking || '',
    confidence: parsed.confidence,  // high | medium | low
    flagForReview: parsed.flagForReview
  };
}
```

### Scoring Prompt Template

```
You are an experienced test evaluator scoring an internship test answer.

## Question Information
- Question Number: {questionNumber}
- Question Text: {questionText}
- Maximum Points: {maxPoints}
- Evaluation Criteria: {evaluationCriteria}
- Sample Answer: {sampleAnswer}

## Rubric Guidelines
- Full Credit: {fullCredit}
- Partial Credit: {partialCredit}
- No Credit: {noCredit}

## Student's Answer
{studentAnswer}

## Your Task
Evaluate step-by-step:
1. What does the question require?
2. What key points should be in a good answer?
3. What did the student provide?
4. What's correct, partially correct, or missing?
5. How many points should be awarded?

Return JSON: { points, feedback, confidence, flagForReview }
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tests/:id/score | Score all extracted answers |

### Parallel Processing

- Processes questions in batches of 2 to respect rate limits
- Uses `Promise.all` for concurrent API calls within batches

---

## Phase 5: Review Dashboard (COMPLETED)

### Human Review Features

- **Inline Score Editing**: Adjust points and feedback per question
- **Review Notes**: Add notes for the entire test
- **Audit Trail**: Tracks reviewer and review timestamp
- **"Adjusted" Badge**: Visual indicator for manually adjusted scores

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tests | List all tests (with filters) |
| GET | /api/tests/:id | Get test details |
| PUT | /api/tests/:id/review | Save review changes |
| GET | /api/tests/export/csv | Export results to CSV |

### Review Endpoint Implementation

```typescript
router.put('/:id/review', async (req, res) => {
  const { scores, reviewNotes, reviewedBy } = req.body;

  // Update individual scores
  for (const scoreUpdate of scores) {
    const existingScore = testResult.scores.find(
      s => s.questionNumber === scoreUpdate.questionNumber
    );
    if (existingScore) {
      existingScore.points = scoreUpdate.points;
      existingScore.feedback = scoreUpdate.feedback;
      existingScore.manuallyAdjusted = true;
    }
  }

  testResult.reviewNotes = reviewNotes;
  testResult.reviewedBy = reviewedBy;
  testResult.reviewedAt = new Date();
  testResult.status = 'reviewed';

  await testResult.save();
});
```

### CSV Export Format

| Column | Description |
|--------|-------------|
| Candidate Name | Test taker name |
| Schema | Schema name and version |
| Status | scored / reviewed |
| Total Score | Sum of all question scores |
| Max Score | Maximum possible score |
| Percentage | Score percentage |
| Q1 Score, Q1 Feedback | Per-question data |
| Q2 Score, Q2 Feedback | ... |
| Review Notes | Human reviewer notes |
| Reviewed By | Reviewer name |
| Reviewed At | Review timestamp |
| Created At | Test upload timestamp |

### Frontend Components

- **ReviewPage.tsx**: Combined list and detail views
  - Test list with status badges
  - Score summary with percentage
  - Question-by-question breakdown
  - Expandable AI reasoning
  - Inline editing mode
  - Export CSV button

---

## User Workflow

```
1. CREATE SCHEMA
   └─> Define questions, max points, criteria, rubric guidelines

2. UPLOAD TEST
   └─> Select schema → Upload images → Wait for processing

3. EXTRACT TEXT (Automatic)
   └─> Claude Vision extracts text and identifies Q&A pairs

4. AI SCORING
   └─> Click "Start AI Scoring" → Claude scores each answer
   └─> Extended thinking provides transparent reasoning

5. HUMAN REVIEW
   └─> Review scores → Adjust if needed → Add notes → Save

6. EXPORT
   └─> Download CSV with all results
```

---

## Environment Variables

```bash
# Backend (.env)
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hackathon-scoring
ANTHROPIC_API_KEY=your_api_key_here
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## Quick Start

```bash
# 1. Start MongoDB
docker compose up -d

# 2. Start Backend
cd backend
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm install
npm run dev

# 3. Start Frontend
cd frontend
npm install
npm run dev

# 4. Open http://localhost:5173
```

---

## Key Claude API Features Used

1. **Vision API**: Extract text from test paper images (handwritten + printed)
2. **Extended Thinking**: Transparent reasoning for scoring decisions
3. **Structured JSON Output**: Consistent, parseable responses
4. **Confidence Levels**: AI self-assessment for flagging uncertain scores
