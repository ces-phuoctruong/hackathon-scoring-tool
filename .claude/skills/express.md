# Express.js Best Practices

Follow these best practices when writing Express.js backend code in this project.

## Project Structure

### 3-Tier Architecture
Separate concerns into layers:

```
src/
├── routes/          # Route definitions (HTTP layer)
├── controllers/     # Request handlers
├── services/        # Business logic
├── models/          # Data models (Mongoose schemas)
├── middleware/      # Express middleware
├── config/          # Configuration files
├── utils/           # Utility functions
├── types/           # TypeScript types
├── app.ts           # Express app setup
└── server.ts        # Server startup (networking)
```

### Separate App from Server
Split Express definition from networking:

```typescript
// app.ts - Express setup
import express from 'express';
import { routes } from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

export { app };

// server.ts - Networking
import { app } from './app';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Route Organization

### Modular Routes
Keep routes in separate files by resource:

```typescript
// routes/index.ts
import { Router } from 'express';
import { schemaRoutes } from './schema.routes';
import { testRoutes } from './test.routes';

const router = Router();
router.use('/schemas', schemaRoutes);
router.use('/tests', testRoutes);

export { router as routes };

// routes/schema.routes.ts
import { Router } from 'express';
import { SchemaController } from '../controllers/schema.controller';

const router = Router();
router.get('/', SchemaController.getAll);
router.post('/', SchemaController.create);
router.get('/:id', SchemaController.getById);
router.put('/:id', SchemaController.update);
router.delete('/:id', SchemaController.delete);

export { router as schemaRoutes };
```

## Controller Pattern

### Keep Controllers Thin
Controllers handle HTTP concerns only:

```typescript
// controllers/schema.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { SchemaService } from '../services/schema.service';

export class SchemaController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = await SchemaService.create(req.body);
      res.status(201).json(schema);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = await SchemaService.findById(req.params.id);
      if (!schema) {
        return res.status(404).json({ error: 'Schema not found' });
      }
      res.json(schema);
    } catch (error) {
      next(error);
    }
  }
}
```

## Service Layer

### Business Logic in Services
Keep business logic separate from HTTP:

```typescript
// services/schema.service.ts
import { ScoringSchema } from '../models/ScoringSchema';
import type { CreateSchemaDto, UpdateSchemaDto } from '../types';

export class SchemaService {
  static async create(data: CreateSchemaDto) {
    const schema = new ScoringSchema(data);
    return schema.save();
  }

  static async findById(id: string) {
    return ScoringSchema.findById(id);
  }

  static async update(id: string, data: UpdateSchemaDto) {
    return ScoringSchema.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id: string) {
    return ScoringSchema.findByIdAndDelete(id);
  }
}
```

## Error Handling

### Centralized Error Handler
Create a global error handling middleware:

```typescript
// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  // Log error for debugging
  console.error(`[${new Date().toISOString()}] ${err.stack}`);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

### Custom Error Classes
Create typed error classes:

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
```

## Input Validation

### Use Validation Libraries
Validate request data with Joi or Zod:

```typescript
// middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Validation failed', details: error });
    }
  };
}

// Usage in routes
import { z } from 'zod';

const createSchemaDto = z.object({
  name: z.string().min(1).max(100),
  questions: z.array(z.object({
    text: z.string(),
    maxPoints: z.number().positive(),
  })),
});

router.post('/', validate(createSchemaDto), SchemaController.create);
```

## Security Best Practices

### Environment Variables
Never hardcode secrets:

```typescript
// config/env.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/app',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;

// Validate required env vars
if (!config.anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY is required');
}
```

### Security Middleware
Use security middleware:

```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use('/api', limiter);

// Body size limit
app.use(express.json({ limit: '10mb' }));
```

### Input Sanitization
Prevent NoSQL injection:

```typescript
import mongoSanitize from 'express-mongo-sanitize';

app.use(mongoSanitize());
```

## Async/Await Patterns

### Async Route Handler Wrapper
Wrap async handlers to catch errors:

```typescript
// utils/asyncHandler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.get('/:id', asyncHandler(async (req, res) => {
  const schema = await SchemaService.findById(req.params.id);
  res.json(schema);
}));
```

## Testing

### Integration Testing with Supertest

```typescript
// tests/schema.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { connectDB, disconnectDB } from '../src/config/database';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

describe('GET /api/schemas', () => {
  it('should return list of schemas', async () => {
    const response = await request(app)
      .get('/api/schemas')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('POST /api/schemas', () => {
  it('should create a new schema', async () => {
    const newSchema = {
      name: 'Test Schema',
      questions: [{ text: 'Q1', maxPoints: 10 }],
    };

    const response = await request(app)
      .post('/api/schemas')
      .send(newSchema)
      .expect(201);

    expect(response.body.name).toBe(newSchema.name);
  });

  it('should return 400 for invalid data', async () => {
    await request(app)
      .post('/api/schemas')
      .send({ invalid: 'data' })
      .expect(400);
  });
});
```

## Performance

### Compression
Enable response compression:

```typescript
import compression from 'compression';

app.use(compression());
```

### Static Files
Serve static files from CDN or separate location:

```typescript
// Serve uploads from dedicated location
app.use('/uploads', express.static(config.uploadDir));

// In production, use CDN or S3 instead
```

## Logging

### Structured Logging

```typescript
import morgan from 'morgan';

// Request logging
app.use(morgan('combined'));

// Custom logger
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({ level: 'error', message, stack: error?.stack, timestamp: new Date().toISOString() }));
  },
};
```

## Health Check

### Health Endpoint
Always include a health check endpoint:

```typescript
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```
