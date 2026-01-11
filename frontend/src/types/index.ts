export interface Question {
  questionNumber: number;
  questionText: string;
  maxPoints: number;
  evaluationCriteria: string;
  sampleAnswer?: string;
}

export interface RubricGuidelines {
  fullCredit: string;
  partialCredit: string;
  noCredit: string;
}

export interface ScoringSchema {
  _id: string;
  name: string;
  version: string;
  description?: string;
  questions: Question[];
  rubricGuidelines: RubricGuidelines;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringSchemaInput {
  name: string;
  version?: string;
  description?: string;
  questions: Omit<Question, 'questionNumber'>[];
  rubricGuidelines: RubricGuidelines;
}

export interface QuestionScore {
  questionNumber: number;
  points: number;
  maxPoints: number;
  feedback: string;
  reasoning?: string;
  confidence: 'high' | 'medium' | 'low';
  flagForReview: boolean;
  manuallyAdjusted?: boolean;
}

export interface TestResult {
  _id: string;
  schemaId: string;
  scoringSchema?: ScoringSchema;
  candidateName?: string;
  originalImages: string[];
  extractedText: string;
  extractedAnswers: { questionNumber: number; studentAnswer: string }[];
  scores: QuestionScore[];
  totalScore: number;
  maxScore: number;
  status: 'pending' | 'processing' | 'extracted' | 'scored' | 'reviewed' | 'error';
  errorMessage?: string;
  errorAt?: string;
  processingStartedAt?: string;
  scoringStartedAt?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestStatusResponse {
  _id: string;
  status: TestResult['status'];
  errorMessage?: string;
  processingStartedAt?: string;
  scoringStartedAt?: string;
  updatedAt: string;
}

export interface BatchUploadResult {
  _id: string;
  status: string;
  candidateName?: string;
  imageCount: number;
}

export interface ReviewUpdateData {
  scores?: Array<{
    questionNumber: number;
    points?: number;
    feedback?: string;
    flagForReview?: boolean;
  }>;
  reviewNotes?: string;
  reviewedBy?: string;
}
