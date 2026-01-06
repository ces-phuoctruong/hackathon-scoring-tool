import { Router } from 'express';
import schemaRoutes from './schema.routes.js';
import testRoutes from './test.routes.js';

const router = Router();

router.use('/schemas', schemaRoutes);
router.use('/tests', testRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
