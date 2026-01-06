import mongoose, { Schema, Document } from 'mongoose';

export interface IExtractedAnswer {
  questionNumber: number;
  studentAnswer: string;
}

export interface IQuestionScore {
  questionNumber: number;
  points: number;
  maxPoints: number;
  feedback: string;
  reasoning?: string;
  confidence: 'high' | 'medium' | 'low';
  flagForReview: boolean;
  manuallyAdjusted?: boolean;
}

export interface ITestResult extends Document {
  schemaId: mongoose.Types.ObjectId;
  candidateName?: string;
  originalImages: string[];
  extractedText: string;
  extractedAnswers: IExtractedAnswer[];
  scores: IQuestionScore[];
  totalScore: number;
  maxScore: number;
  status: 'pending' | 'processing' | 'extracted' | 'scored' | 'reviewed';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExtractedAnswerSchema = new Schema<IExtractedAnswer>({
  questionNumber: { type: Number, required: true },
  studentAnswer: { type: String, required: true },
});

const QuestionScoreSchema = new Schema<IQuestionScore>({
  questionNumber: { type: Number, required: true },
  points: { type: Number, required: true, min: 0 },
  maxPoints: { type: Number, required: true, min: 0 },
  feedback: { type: String, required: true },
  reasoning: { type: String },
  confidence: { type: String, enum: ['high', 'medium', 'low'], required: true },
  flagForReview: { type: Boolean, default: false },
  manuallyAdjusted: { type: Boolean, default: false },
});

const TestResultSchema = new Schema<ITestResult>(
  {
    schemaId: { type: Schema.Types.ObjectId, ref: 'ScoringSchema', required: true },
    candidateName: { type: String },
    originalImages: { type: [String], required: true },
    extractedText: { type: String, default: '' },
    extractedAnswers: { type: [ExtractedAnswerSchema], default: [] },
    scores: { type: [QuestionScoreSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'extracted', 'scored', 'reviewed'],
      default: 'pending',
    },
    reviewNotes: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Calculate total score before saving
TestResultSchema.pre('save', function (next) {
  if (this.scores.length > 0) {
    this.totalScore = this.scores.reduce((sum, s) => sum + s.points, 0);
    this.maxScore = this.scores.reduce((sum, s) => sum + s.maxPoints, 0);
  }
  next();
});

export const TestResult = mongoose.model<ITestResult>('TestResult', TestResultSchema);
