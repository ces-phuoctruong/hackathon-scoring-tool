import { Router, Request, Response } from 'express';
import { upload } from '../config/upload.js';
import { TestResult, ScoringSchema, type IScoringSchema } from '../models/index.js';
import { extractTextFromMultipleImages } from '../services/claude-vision.service.js';
import { scoreAllAnswersParallel } from '../services/scoring.service.js';

const router = Router();

// POST /api/tests/upload - Upload test paper images and create test record
router.post('/upload', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { schemaId, candidateName } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    if (!schemaId) {
      res.status(400).json({ error: 'Schema ID is required' });
      return;
    }

    // Verify schema exists
    const schema = await ScoringSchema.findById(schemaId);
    if (!schema) {
      res.status(404).json({ error: 'Schema not found' });
      return;
    }

    // Create test result record
    const testResult = new TestResult({
      schemaId,
      candidateName: candidateName || undefined,
      originalImages: files.map((f) => f.path),
      status: 'pending',
      maxScore: schema.totalPoints,
    });

    await testResult.save();

    res.status(201).json({
      test: {
        _id: testResult._id,
        status: testResult.status,
        originalImages: testResult.originalImages,
        candidateName: testResult.candidateName,
      },
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// POST /api/tests/:id/process - Process uploaded test with Claude Vision
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const testResult = await TestResult.findById(req.params.id);

    if (!testResult) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    if (testResult.status !== 'pending') {
      res.status(400).json({ error: 'Test has already been processed' });
      return;
    }

    // Update status to processing
    testResult.status = 'processing';
    await testResult.save();

    try {
      // Extract text from images using Claude Vision
      const extracted = await extractTextFromMultipleImages(testResult.originalImages);

      // Update test result with extracted content
      testResult.extractedText = extracted.rawText;
      testResult.extractedAnswers = extracted.questions.map((q) => ({
        questionNumber: q.questionNumber,
        studentAnswer: q.studentAnswer,
      }));
      testResult.status = 'extracted';
      await testResult.save();

      res.json({
        test: {
          _id: testResult._id,
          status: testResult.status,
          extractedText: testResult.extractedText,
          extractedAnswers: testResult.extractedAnswers,
        },
      });
    } catch (extractError) {
      // Revert status on error
      testResult.status = 'pending';
      await testResult.save();
      throw extractError;
    }
  } catch (error) {
    console.error('Error processing test:', error);
    res.status(500).json({ error: 'Failed to process test' });
  }
});

// POST /api/tests/:id/score - Score extracted answers using Claude
router.post('/:id/score', async (req: Request, res: Response) => {
  try {
    const testResult = await TestResult.findById(req.params.id).populate('schemaId');

    if (!testResult) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    if (testResult.status !== 'extracted') {
      res.status(400).json({ error: 'Test must be extracted before scoring' });
      return;
    }

    const schema = testResult.schemaId as IScoringSchema;
    if (!schema) {
      res.status(400).json({ error: 'Schema not found for this test' });
      return;
    }

    // Update status to processing
    testResult.status = 'processing';
    await testResult.save();

    try {
      // Score all answers using Claude with extended thinking
      const scores = await scoreAllAnswersParallel(
        schema.questions,
        testResult.extractedAnswers,
        schema.rubricGuidelines,
        2 // Process 2 questions at a time to respect rate limits
      );

      // Update test result with scores
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
      await testResult.save();

      res.json({
        test: {
          _id: testResult._id,
          status: testResult.status,
          scores: testResult.scores,
          totalScore: testResult.totalScore,
          maxScore: testResult.maxScore,
        },
      });
    } catch (scoreError) {
      // Revert status on error
      testResult.status = 'extracted';
      await testResult.save();
      throw scoreError;
    }
  } catch (error) {
    console.error('Error scoring test:', error);
    res.status(500).json({ error: 'Failed to score test' });
  }
});

// GET /api/tests - List all test results
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schemaId, status } = req.query;

    const filter: Record<string, unknown> = {};
    if (schemaId) filter.schemaId = schemaId;
    if (status) filter.status = status;

    const tests = await TestResult.find(filter)
      .select('candidateName status totalScore maxScore createdAt updatedAt schemaId')
      .populate('schemaId', 'name version')
      .sort({ createdAt: -1 });

    res.json({ tests });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// GET /api/tests/:id - Get test result details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const testResult = await TestResult.findById(req.params.id).populate('schemaId');

    if (!testResult) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    res.json({ test: testResult });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// PUT /api/tests/:id/review - Update test scores after human review
router.put('/:id/review', async (req: Request, res: Response) => {
  try {
    const testResult = await TestResult.findById(req.params.id);

    if (!testResult) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    if (testResult.status !== 'scored' && testResult.status !== 'reviewed') {
      res.status(400).json({ error: 'Test must be scored before review' });
      return;
    }

    const { scores, reviewNotes, reviewedBy } = req.body;

    // Update individual scores if provided
    if (scores && Array.isArray(scores)) {
      for (const scoreUpdate of scores) {
        const existingScore = testResult.scores.find(
          (s) => s.questionNumber === scoreUpdate.questionNumber
        );
        if (existingScore) {
          if (typeof scoreUpdate.points === 'number') {
            existingScore.points = Math.max(0, Math.min(scoreUpdate.points, existingScore.maxPoints));
            existingScore.manuallyAdjusted = true;
          }
          if (scoreUpdate.feedback) {
            existingScore.feedback = scoreUpdate.feedback;
          }
          if (typeof scoreUpdate.flagForReview === 'boolean') {
            existingScore.flagForReview = scoreUpdate.flagForReview;
          }
        }
      }
    }

    // Update review metadata
    if (reviewNotes !== undefined) {
      testResult.reviewNotes = reviewNotes;
    }
    if (reviewedBy) {
      testResult.reviewedBy = reviewedBy;
    }
    testResult.reviewedAt = new Date();
    testResult.status = 'reviewed';

    await testResult.save();

    res.json({ test: testResult });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// GET /api/tests/export/csv - Export results to CSV
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const { schemaId } = req.query;

    const filter: Record<string, unknown> = {
      status: { $in: ['scored', 'reviewed'] },
    };
    if (schemaId) filter.schemaId = schemaId;

    const tests = await TestResult.find(filter)
      .populate('schemaId', 'name version questions')
      .sort({ createdAt: -1 });

    if (tests.length === 0) {
      res.status(404).json({ error: 'No scored tests found to export' });
      return;
    }

    // Build CSV header
    const schema = tests[0].schemaId as IScoringSchema;
    const questionHeaders = schema.questions
      .map((q) => [`Q${q.questionNumber} Score`, `Q${q.questionNumber} Feedback`])
      .flat();

    const headers = [
      'Candidate Name',
      'Schema',
      'Status',
      'Total Score',
      'Max Score',
      'Percentage',
      ...questionHeaders,
      'Review Notes',
      'Reviewed By',
      'Reviewed At',
      'Created At',
    ];

    // Build CSV rows
    const rows = tests.map((test) => {
      const testSchema = test.schemaId as IScoringSchema;
      const questionData = testSchema.questions
        .map((q) => {
          const score = test.scores.find((s) => s.questionNumber === q.questionNumber);
          return [
            score ? `${score.points}/${score.maxPoints}` : '-',
            score?.feedback || '-',
          ];
        })
        .flat();

      return [
        test.candidateName || 'Unnamed',
        `${testSchema.name} v${testSchema.version}`,
        test.status,
        test.totalScore.toString(),
        test.maxScore.toString(),
        ((test.totalScore / test.maxScore) * 100).toFixed(1) + '%',
        ...questionData,
        test.reviewNotes || '',
        test.reviewedBy || '',
        test.reviewedAt ? new Date(test.reviewedAt).toISOString() : '',
        new Date(test.createdAt).toISOString(),
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="test-results-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

export default router;
