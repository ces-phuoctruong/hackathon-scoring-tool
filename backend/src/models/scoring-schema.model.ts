import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionNumber: number;
  questionText: string;
  maxPoints: number;
  evaluationCriteria: string;
  sampleAnswer?: string;
}

export interface IScoringSchema extends Document {
  name: string;
  version: string;
  description?: string;
  questions: IQuestion[];
  rubricGuidelines: {
    fullCredit: string;
    partialCredit: string;
    noCredit: string;
  };
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  maxPoints: { type: Number, required: true, min: 0 },
  evaluationCriteria: { type: String, required: true },
  sampleAnswer: { type: String },
});

const ScoringSchemaSchema = new Schema<IScoringSchema>(
  {
    name: { type: String, required: true, trim: true },
    version: { type: String, required: true, default: '1.0' },
    description: { type: String },
    questions: { type: [QuestionSchema], required: true, validate: [(v: IQuestion[]) => v.length > 0, 'At least one question is required'] },
    rubricGuidelines: {
      fullCredit: { type: String, required: true },
      partialCredit: { type: String, required: true },
      noCredit: { type: String, required: true },
    },
    totalPoints: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Calculate total points before saving
ScoringSchemaSchema.pre('save', function (next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + q.maxPoints, 0);
  next();
});

export const ScoringSchema = mongoose.model<IScoringSchema>('ScoringSchema', ScoringSchemaSchema);
