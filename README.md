# Hackathon Scoring Tool

AI-assisted internship test scoring tool using Claude's vision and analysis capabilities for faster, fairer, and more consistent candidate evaluation.

## Features

- **Scoring Schema Management**: Define test structure, questions, max points, and evaluation criteria
- **Test Paper Processing**: Upload images (JPG/PNG/PDF) of test papers for AI-powered OCR
- **AI-Assisted Scoring**: Automated scoring using Claude API with extended thinking for transparent reasoning
- **Human Review Interface**: Review AI suggestions, adjust scores, and add notes
- **Batch Processing & Export**: Process multiple papers and export results to CSV/Excel

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB
- **AI**: Anthropic Claude API (Vision + Extended Thinking)

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Anthropic API Key

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd hackathon-scoring-tool
```

### 2. Start MongoDB

```bash
docker compose up -d
```

This starts MongoDB on `localhost:27017`.

### 3. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Backend runs on `http://localhost:3001`.

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Project Structure

```
hackathon-scoring-tool/
├── backend/
│   ├── src/
│   │   ├── config/        # Database and app configuration
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic (Claude API, scoring)
│   │   └── server.ts      # Express server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── App.tsx        # Main app with routing
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml     # MongoDB container
└── README.md
```

## API Endpoints

### Schemas
- `GET /api/schemas` - List all scoring schemas
- `GET /api/schemas/:id` - Get a specific schema
- `POST /api/schemas` - Create a new schema
- `PUT /api/schemas/:id` - Update a schema
- `DELETE /api/schemas/:id` - Delete a schema

### Tests
- `POST /api/tests/upload` - Upload test paper images
- `POST /api/tests/process` - Process uploaded test with Claude Vision
- `POST /api/tests/score` - Score extracted answers
- `GET /api/tests` - List all test results
- `GET /api/tests/:id` - Get a specific test result
- `PUT /api/tests/:id/review` - Update scores after review
- `GET /api/tests/export/csv` - Export results to CSV

## Environment Variables

### Backend (.env)

```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hackathon-scoring
ANTHROPIC_API_KEY=your_api_key_here
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

## Development

### Running tests
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Building for production
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## License

MIT
