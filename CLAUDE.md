# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-assisted internship test scoring tool using Claude's vision and analysis capabilities. The tool allows scorers to upload test papers, define scoring schemas, and get AI-generated scores with human review.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (via Docker)
- **AI**: Anthropic Claude API (Vision + Extended Thinking)

## Development Commands

### Start MongoDB
```bash
docker compose up -d
```

### Backend (runs on port 3001)
```bash
cd backend
npm install
npm run dev          # Development with hot reload
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Frontend (runs on port 5173)
```bash
cd frontend
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run ESLint
```

## Architecture

```
Frontend (React + Vite)  →  Backend (Express)  →  MongoDB
                                    ↓
                              Claude API
                         (Vision + Scoring)
```

### Backend Structure
- `src/config/` - Database connection, environment config, file upload config
- `src/routes/` - API endpoints for schemas and tests
- `src/models/` - Mongoose schemas (ScoringSchema, TestResult)
- `src/services/` - Claude Vision API (OCR) and scoring logic (extended thinking)

### Frontend Structure
- `src/pages/` - Main views (Home, SchemaBuilder, Upload, Review)
- `src/components/` - Reusable UI components (Layout, SchemaBuilder, SchemaList, FileUpload)
- `src/services/api.ts` - Axios API client
- `src/types/` - TypeScript interfaces

### Key Services
- `claude-vision.service.ts` - Text extraction from test paper images
- `scoring.service.ts` - AI scoring with extended thinking for transparent reasoning

### API Routes
- `/api/schemas` - CRUD for scoring schemas
- `/api/tests/upload` - Upload test paper images
- `/api/tests/:id/process` - Extract text via Claude Vision
- `/api/tests/:id/score` - AI scoring with extended thinking
- `/api/tests/:id/review` - Human review adjustments
- `/api/tests/export/csv` - Export results to CSV
- `/api/health` - Health check endpoint

## Environment Variables

Backend requires `.env` file (copy from `.env.example`):
- `ANTHROPIC_API_KEY` - Required for Claude API calls
- `MONGODB_URI` - MongoDB connection string (default: localhost:27017)
- `PORT` - Server port (default: 3001)
- `UPLOAD_DIR` - Directory for uploaded files (default: ./uploads)

## Workflow

1. **Create Schema**: Define test questions, max points, evaluation criteria, rubric guidelines
2. **Upload Test**: Select schema, upload test paper images (JPG/PNG/PDF)
3. **Extract Text**: Claude Vision extracts handwritten/printed text and identifies Q&A pairs
4. **AI Scoring**: Claude with extended thinking scores each answer with reasoning
5. **Human Review**: Review scores, adjust points/feedback, add notes
6. **Export**: Download CSV with all scores and feedback
