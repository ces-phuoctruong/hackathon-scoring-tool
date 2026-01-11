import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import type { IQuestion } from '../models/index.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export interface CriterionScoreResult {
  criterionText: string;
  points: number;
  maxPoints: number;
  feedback?: string;
}

export interface ScoringResult {
  questionNumber: number;
  points: number;
  maxPoints: number;
  feedback: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  flagForReview: boolean;
  criteriaBreakdown?: CriterionScoreResult[];
}

export interface RubricGuidelines {
  fullCredit: string;
  partialCredit: string;
  noCredit: string;
}

/**
 * Parse evaluation criteria string into array of criteria.
 * Handles multiple formats:
 * - Newline separated
 * - Comma separated
 * - Numbered list (1. 2. 3.)
 * - Bullet points (- * •)
 */
function parseCriteriaString(criteriaStr: string): string[] {
  if (!criteriaStr || !criteriaStr.trim()) {
    return [];
  }

  // Try splitting by newlines first
  let criteria = criteriaStr
    .split('\n')
    .map(c => c.trim())
    .filter(c => c.length > 0);

  // If we only got one item, try comma separation
  if (criteria.length === 1) {
    criteria = criteriaStr
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  // Clean up common prefixes (numbers, bullets)
  criteria = criteria.map(c =>
    c.replace(/^[\d]+[\.\)]\s*/, '')   // Remove "1. " or "1) "
     .replace(/^[-*•]\s*/, '')         // Remove "- " or "* " or "• "
     .trim()
  ).filter(c => c.length > 0);

  return criteria;
}

function buildScoringPrompt(
  question: IQuestion,
  studentAnswer: string,
  rubricGuidelines: RubricGuidelines
): string {
  const criteria = parseCriteriaString(question.evaluationCriteria);
  const hasCriteria = criteria.length > 0;

  return `You are an experienced test evaluator scoring an internship test answer.

## Question Information
- Question Number: ${question.questionNumber}
- Question Text: ${question.questionText}
- Maximum Points: ${question.maxPoints}
- Evaluation Criteria: ${question.evaluationCriteria}
${question.sampleAnswer ? `- Sample/Expected Answer: ${question.sampleAnswer}` : ''}

${hasCriteria ? `## Detailed Evaluation Criteria
The evaluation criteria have been broken down into ${criteria.length} specific points:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

You must distribute the ${question.maxPoints} points across these criteria based on how well the student addressed each one.` : ''}

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
${hasCriteria ? `5. For EACH criterion listed above, how many points should be awarded?
6. How many total points should be awarded (0 to ${question.maxPoints})?` : `5. How many points should be awarded (0 to ${question.maxPoints})?`}

Return your evaluation as valid JSON in this exact format:
{
  "points": <total number between 0 and ${question.maxPoints}>,
  "feedback": "<constructive feedback for the student, 1-3 sentences>",
  "reasoning": "<your step-by-step reasoning for the score, 2-4 sentences>",
  "confidence": "<high|medium|low>",
  "flagForReview": <true if answer is ambiguous or needs human verification, false otherwise>${hasCriteria ? `,
  "criteriaBreakdown": [
    {
      "criterionText": "<exact text of criterion>",
      "points": <points awarded for this criterion>,
      "maxPoints": <max points possible for this criterion>,
      "feedback": "<optional specific feedback for this criterion>"
    }
    // ... one entry for each criterion
  ]` : ''}
}

${hasCriteria ? `IMPORTANT REQUIREMENTS for criteriaBreakdown:
- Include exactly ${criteria.length} entries, one for each criterion listed above
- The "criterionText" must match the criteria text exactly
- Distribute points fairly across criteria based on student performance
- The sum of all criterion points MUST equal the total "points" value
- Suggest appropriate maxPoints for each criterion (they should sum to ${question.maxPoints})
- If a criterion wasn't addressed, give 0 points but still include it

` : ''}Guidelines:
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
  const criteria = parseCriteriaString(question.evaluationCriteria);
  const hasCriteria = criteria.length > 0;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textContent = response.text();

    if (!textContent) {
      throw new Error('No text response from Gemini API');
    }

    // Parse the JSON result
    let jsonText = textContent.trim();
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
      reasoning: string;
      confidence: 'high' | 'medium' | 'low';
      flagForReview: boolean;
      criteriaBreakdown?: Array<{
        criterionText: string;
        points: number;
        maxPoints: number;
        feedback?: string;
      }>;
    };

    // Validate and clamp points
    const points = Math.max(0, Math.min(parsed.points || 0, question.maxPoints));

    // Validate and process criteria breakdown if present
    let criteriaBreakdown: CriterionScoreResult[] | undefined;
    if (hasCriteria && parsed.criteriaBreakdown && parsed.criteriaBreakdown.length > 0) {
      criteriaBreakdown = parsed.criteriaBreakdown.map(c => ({
        criterionText: c.criterionText,
        points: Math.max(0, c.points),
        maxPoints: Math.max(0, c.maxPoints),
        feedback: c.feedback,
      }));

      // Validate sum
      const breakdownSum = criteriaBreakdown.reduce((sum, c) => sum + c.points, 0);
      if (Math.abs(breakdownSum - points) > 0.01) {
        console.warn(
          `Question ${question.questionNumber}: Breakdown sum (${breakdownSum}) ` +
          `doesn't match total points (${points}). Normalizing breakdown.`
        );
        // Normalize the breakdown to match total points
        if (breakdownSum > 0) {
          const scale = points / breakdownSum;
          criteriaBreakdown = criteriaBreakdown.map(c => ({
            ...c,
            points: Math.round(c.points * scale * 100) / 100,
          }));
        }
      }
    }

    return {
      questionNumber: question.questionNumber,
      points,
      maxPoints: question.maxPoints,
      feedback: parsed.feedback || 'No feedback provided',
      reasoning: parsed.reasoning || 'No reasoning provided',
      confidence: parsed.confidence || 'medium',
      flagForReview: parsed.flagForReview ?? false,
      criteriaBreakdown,
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
