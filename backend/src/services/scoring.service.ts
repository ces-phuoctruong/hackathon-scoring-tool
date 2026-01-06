import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import type { IQuestion } from '../models/index.js';

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export interface ScoringResult {
  questionNumber: number;
  points: number;
  maxPoints: number;
  feedback: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  flagForReview: boolean;
}

export interface RubricGuidelines {
  fullCredit: string;
  partialCredit: string;
  noCredit: string;
}

function buildScoringPrompt(
  question: IQuestion,
  studentAnswer: string,
  rubricGuidelines: RubricGuidelines
): string {
  return `You are an experienced test evaluator scoring an internship test answer.

## Question Information
- Question Number: ${question.questionNumber}
- Question Text: ${question.questionText}
- Maximum Points: ${question.maxPoints}
- Evaluation Criteria: ${question.evaluationCriteria}
${question.sampleAnswer ? `- Sample/Expected Answer: ${question.sampleAnswer}` : ''}

## Rubric Guidelines
- Full Credit: ${rubricGuidelines.fullCredit}
- Partial Credit: ${rubricGuidelines.partialCredit}
- No Credit: ${rubricGuidelines.noCredit}

## Student's Answer
${studentAnswer || '(No answer provided)'}

## Your Task
Evaluate the student's answer against the criteria and rubric. Think step-by-step:
1. What does the question require?
2. What key points should be in a good answer?
3. What did the student provide?
4. What's correct, partially correct, or missing?
5. How many points should be awarded (0 to ${question.maxPoints})?

Return your evaluation as valid JSON in this exact format:
{
  "points": <number between 0 and ${question.maxPoints}>,
  "feedback": "<constructive feedback for the student, 1-3 sentences>",
  "confidence": "<high|medium|low>",
  "flagForReview": <true if answer is ambiguous or needs human verification, false otherwise>
}

Guidelines:
- Be fair but rigorous in your evaluation
- Award partial credit for partially correct answers
- Focus on understanding and key concepts over exact wording
- If the answer is blank or irrelevant, award 0 points
- Set confidence to "low" and flagForReview to true if you're uncertain
- Return ONLY the JSON, no additional text`;
}

export async function scoreAnswer(
  question: IQuestion,
  studentAnswer: string,
  rubricGuidelines: RubricGuidelines
): Promise<ScoringResult> {
  const prompt = buildScoringPrompt(question, studentAnswer, rubricGuidelines);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract thinking and text blocks
    let reasoning = '';
    let resultText = '';

    for (const block of response.content) {
      if (block.type === 'thinking') {
        reasoning = block.thinking;
      } else if (block.type === 'text') {
        resultText = block.text;
      }
    }

    // Parse the JSON result
    let jsonText = resultText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }

    const parsed = JSON.parse(jsonText.trim()) as {
      points: number;
      feedback: string;
      confidence: 'high' | 'medium' | 'low';
      flagForReview: boolean;
    };

    // Validate and clamp points
    const points = Math.max(0, Math.min(parsed.points || 0, question.maxPoints));

    return {
      questionNumber: question.questionNumber,
      points,
      maxPoints: question.maxPoints,
      feedback: parsed.feedback || 'No feedback provided',
      reasoning,
      confidence: parsed.confidence || 'medium',
      flagForReview: parsed.flagForReview ?? false,
    };
  } catch (error) {
    console.error(`Error scoring question ${question.questionNumber}:`, error);

    // Return a flagged result on error
    return {
      questionNumber: question.questionNumber,
      points: 0,
      maxPoints: question.maxPoints,
      feedback: 'Error during scoring. Please review manually.',
      reasoning: `Scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 'low',
      flagForReview: true,
    };
  }
}

export async function scoreAllAnswers(
  questions: IQuestion[],
  extractedAnswers: { questionNumber: number; studentAnswer: string }[],
  rubricGuidelines: RubricGuidelines
): Promise<ScoringResult[]> {
  // Create a map of answers by question number
  const answersMap = new Map<number, string>();
  for (const answer of extractedAnswers) {
    answersMap.set(answer.questionNumber, answer.studentAnswer);
  }

  // Score each question
  const results: ScoringResult[] = [];

  for (const question of questions) {
    const studentAnswer = answersMap.get(question.questionNumber) || '';
    const result = await scoreAnswer(question, studentAnswer, rubricGuidelines);
    results.push(result);
  }

  return results;
}

export async function scoreAllAnswersParallel(
  questions: IQuestion[],
  extractedAnswers: { questionNumber: number; studentAnswer: string }[],
  rubricGuidelines: RubricGuidelines,
  concurrency: number = 3
): Promise<ScoringResult[]> {
  // Create a map of answers by question number
  const answersMap = new Map<number, string>();
  for (const answer of extractedAnswers) {
    answersMap.set(answer.questionNumber, answer.studentAnswer);
  }

  // Process in batches to respect rate limits
  const results: ScoringResult[] = [];

  for (let i = 0; i < questions.length; i += concurrency) {
    const batch = questions.slice(i, i + concurrency);
    const batchPromises = batch.map((question) => {
      const studentAnswer = answersMap.get(question.questionNumber) || '';
      return scoreAnswer(question, studentAnswer, rubricGuidelines);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  // Sort by question number
  results.sort((a, b) => a.questionNumber - b.questionNumber);

  return results;
}
