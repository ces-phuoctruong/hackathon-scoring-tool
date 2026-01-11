import { TestResult, ScoringSchema } from '../models/index.js';
import { extractTextFromMultipleImages } from './gemini-vision.service.js';
import { scoreAllAnswersParallel } from './scoring.service.js';

/**
 * Process test images in the background (fire-and-forget).
 * Extracts text from images and updates the test result.
 */
export async function processTestInBackground(testId: string): Promise<void> {
  try {
    const testResult = await TestResult.findById(testId);
    if (!testResult) {
      console.error(`Background processing: Test ${testId} not found`);
      return;
    }

    console.log(`Background processing: Starting text extraction for test ${testId}`);

    const extracted = await extractTextFromMultipleImages(testResult.originalImages);

    testResult.extractedText = extracted.rawText;
    testResult.extractedAnswers = extracted.questions.map((q) => ({
      questionNumber: q.questionNumber,
      studentAnswer: q.studentAnswer,
    }));
    testResult.status = 'extracted';
    testResult.errorMessage = undefined;
    await testResult.save();

    console.log(`Background processing: Text extraction completed for test ${testId}`);
  } catch (error) {
    console.error(`Background processing failed for test ${testId}:`, error);
    await TestResult.findByIdAndUpdate(testId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Processing failed',
      errorAt: new Date(),
    });
  }
}

/**
 * Score a test in the background (fire-and-forget).
 * Scores all extracted answers and updates the test result.
 */
export async function scoreTestInBackground(testId: string): Promise<void> {
  try {
    const testResult = await TestResult.findById(testId);
    if (!testResult) {
      console.error(`Background scoring: Test ${testId} not found`);
      return;
    }

    const schema = await ScoringSchema.findById(testResult.schemaId);
    if (!schema) {
      throw new Error('Schema not found for this test');
    }

    console.log(`Background scoring: Starting scoring for test ${testId}`);

    const scores = await scoreAllAnswersParallel(
      schema.questions,
      testResult.extractedAnswers,
      schema.rubricGuidelines,
      2 // Concurrency of 2 to respect rate limits
    );

    testResult.scores = scores.map((s) => ({
      questionNumber: s.questionNumber,
      points: s.points,
      maxPoints: s.maxPoints,
      feedback: s.feedback,
      reasoning: s.reasoning,
      confidence: s.confidence,
      flagForReview: s.flagForReview,
      manuallyAdjusted: false,
    }));
    testResult.status = 'scored';
    testResult.errorMessage = undefined;
    await testResult.save();

    console.log(`Background scoring: Scoring completed for test ${testId}`);
  } catch (error) {
    console.error(`Background scoring failed for test ${testId}:`, error);
    await TestResult.findByIdAndUpdate(testId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Scoring failed',
      errorAt: new Date(),
    });
  }
}
