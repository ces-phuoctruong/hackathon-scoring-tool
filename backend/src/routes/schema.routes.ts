import { Router, Request, Response } from 'express';
import { ScoringSchema } from '../models/index.js';

const router = Router();

// GET /api/schemas - List all scoring schemas
router.get('/', async (_req: Request, res: Response) => {
  try {
    const schemas = await ScoringSchema.find().sort({ updatedAt: -1 });
    res.json({ schemas });
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).json({ error: 'Failed to fetch schemas' });
  }
});

// GET /api/schemas/:id - Get a specific schema
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const schema = await ScoringSchema.findById(req.params.id);
    if (!schema) {
      res.status(404).json({ error: 'Schema not found' });
      return;
    }
    res.json({ schema });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// POST /api/schemas - Create a new scoring schema
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, version, description, questions, rubricGuidelines } = req.body;

    // Validate required fields
    if (!name || !questions || !rubricGuidelines) {
      res.status(400).json({ error: 'Missing required fields: name, questions, rubricGuidelines' });
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'At least one question is required' });
      return;
    }

    const schema = new ScoringSchema({
      name,
      version: version || '1.0',
      description,
      questions,
      rubricGuidelines,
      totalPoints: 0, // Will be calculated in pre-save hook
    });

    await schema.save();
    res.status(201).json({ schema });
  } catch (error) {
    console.error('Error creating schema:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create schema' });
  }
});

// PUT /api/schemas/:id - Update a schema
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, version, description, questions, rubricGuidelines } = req.body;

    const schema = await ScoringSchema.findById(req.params.id);
    if (!schema) {
      res.status(404).json({ error: 'Schema not found' });
      return;
    }

    // Update fields if provided
    if (name) schema.name = name;
    if (version) schema.version = version;
    if (description !== undefined) schema.description = description;
    if (questions) schema.questions = questions;
    if (rubricGuidelines) schema.rubricGuidelines = rubricGuidelines;

    await schema.save();
    res.json({ schema });
  } catch (error) {
    console.error('Error updating schema:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update schema' });
  }
});

// DELETE /api/schemas/:id - Delete a schema
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const schema = await ScoringSchema.findByIdAndDelete(req.params.id);
    if (!schema) {
      res.status(404).json({ error: 'Schema not found' });
      return;
    }
    res.json({ message: 'Schema deleted successfully' });
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).json({ error: 'Failed to delete schema' });
  }
});

export default router;
