import mongoose, { Schema, Document } from 'mongoose';
import { IScoringSchema } from './scoring-schema.model';

export interface IExtractedAnswer {
  questionNumber: number;
  studentAnswer: string;
}

export interface ICriterionScore {
  criterionText: string;
  points: number;
  maxPoints: number;
  feedback?: string;
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
  criteriaBreakdown?: ICriterionScore[];
}

export interface ITestResult extends Document {
  schemaId: mongoose.Types.ObjectId;
  scoringSchema?: IScoringSchema;
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

const CriterionScoreSchema = new Schema<ICriterionScore>({
  criterionText: { type: String, required: true },
  points: { type: Number, required: true, min: 0 },
  maxPoints: { type: Number, required: true, min: 0 },
  feedback: { type: String },
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
  criteriaBreakdown: { type: [CriterionScoreSchema] },
});

const TestResultSchema = new Schema<ITestResult>(
  {
    schemaId: { type: Schema.Types.ObjectId, required: true },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for populated scoring schema
TestResultSchema.virtual('scoringSchema', {
  ref: 'ScoringSchema',
  localField: 'schemaId',
  foreignField: '_id',
  justOne: true,
});

// Calculate total score and validate breakdown before saving
TestResultSchema.pre('save', function (next) {
  if (this.scores.length > 0) {
    // Validate criteria breakdown sums if present
    for (const score of this.scores) {
      if (score.criteriaBreakdown && score.criteriaBreakdown.length > 0) {
        const breakdownTotal = score.criteriaBreakdown.reduce((sum, c) => sum + c.points, 0);
        // Allow small floating point differences (tolerance: 0.01)
        if (Math.abs(breakdownTotal - score.points) > 0.01) {
          throw new Error(
            `Question ${score.questionNumber}: Criteria breakdown sum (${breakdownTotal}) must equal total points (${score.points})`
          );
        }
      }
    }

    this.totalScore = this.scores.reduce((sum, s) => sum + s.points, 0);
    this.maxScore = this.scores.reduce((sum, s) => sum + s.maxPoints, 0);
  }
  next();
});

export const TestResult = mongoose.model<ITestResult>('TestResult', TestResultSchema);
