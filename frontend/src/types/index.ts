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
}

export interface TestResult {
  _id: string;
  schemaId: string;
  candidateName?: string;
  originalImages: string[];
  extractedText: string;
  extractedAnswers: { questionNumber: number; studentAnswer: string }[];
  scores: QuestionScore[];
  totalScore: number;
  maxScore: number;
  status: 'pending' | 'processing' | 'scored' | 'reviewed';
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}
