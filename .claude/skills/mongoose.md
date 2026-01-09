# Mongoose / MongoDB Best Practices

Follow these best practices when working with Mongoose and MongoDB in this project.

## Schema Design Principles

### Data That's Accessed Together Should Be Stored Together
Embed related data when it's frequently accessed together:

```typescript
// Good - embedded address for users
const UserSchema = new Schema({
  name: String,
  email: String,
  address: {
    street: String,
    city: String,
    country: String,
  },
});

// Good - embedded questions in scoring schema
const ScoringSchemaSchema = new Schema({
  name: String,
  questions: [{
    text: String,
    maxPoints: Number,
    criteria: String,
  }],
});
```

### Embedding vs Referencing

**Embed when:**
- Data is small and bounded
- Data is accessed together
- Data doesn't change frequently
- One-to-few relationships

**Reference when:**
- Data is large or unbounded
- Data is accessed independently
- Data changes frequently
- Many-to-many relationships

```typescript
// Embed - test answers belong to test result
const TestResultSchema = new Schema({
  testId: String,
  answers: [{
    questionId: String,
    extractedText: String,
    score: Number,
    feedback: String,
  }],
});

// Reference - if answers could be shared or very large
const TestResultSchema = new Schema({
  testId: String,
  answers: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
});
```

## Schema Definition

### Always Use TypeScript Interfaces
Define types alongside schemas:

```typescript
import { Schema, model, Document } from 'mongoose';

// Define interface
interface IUser {
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extend Document for Mongoose methods
interface IUserDocument extends IUser, Document {}

// Define schema
const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// Create model
export const User = model<IUserDocument>('User', UserSchema);
```

### Enable Timestamps
Always use automatic timestamps:

```typescript
const schema = new Schema(
  {
    name: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);
```

### Schema Options
Configure schemas properly:

```typescript
const schema = new Schema(
  { /* fields */ },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);
```

## Indexing

### Index Frequently Queried Fields
Create indexes for fields used in queries:

```typescript
const TestResultSchema = new Schema({
  schemaId: { type: Schema.Types.ObjectId, ref: 'ScoringSchema', index: true },
  status: { type: String, enum: ['pending', 'processing', 'completed'], index: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound index for common query patterns
TestResultSchema.index({ schemaId: 1, status: 1 });
TestResultSchema.index({ createdAt: -1 }); // Descending for recent first
```

### Avoid Over-Indexing
- Only index fields used in queries
- Each index adds write overhead
- Monitor index usage in production

## Query Optimization

### Use lean() for Read-Only Queries
Return plain objects instead of Mongoose documents:

```typescript
// Good - plain objects, faster
const users = await User.find({ status: 'active' }).lean();

// Only use full documents when you need Mongoose methods
const user = await User.findById(id); // Full document for saving
user.name = 'New Name';
await user.save();
```

### Select Only Needed Fields
Project only required fields:

```typescript
// Good - only fetch needed fields
const users = await User.find()
  .select('name email')
  .lean();

// Exclude fields
const users = await User.find()
  .select('-password -__v')
  .lean();
```

### Pagination
Always paginate large result sets:

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
}

async function findPaginated(options: PaginationOptions) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    TestResult.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TestResult.countDocuments(),
  ]);

  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

## Virtual Fields

### Use Virtuals for Computed Properties
Don't store derived data:

```typescript
const TestResultSchema = new Schema({
  answers: [{
    score: Number,
    maxScore: Number,
  }],
});

// Virtual for total score
TestResultSchema.virtual('totalScore').get(function() {
  return this.answers.reduce((sum, a) => sum + a.score, 0);
});

TestResultSchema.virtual('maxPossibleScore').get(function() {
  return this.answers.reduce((sum, a) => sum + a.maxScore, 0);
});

TestResultSchema.virtual('percentage').get(function() {
  const max = this.maxPossibleScore;
  return max > 0 ? (this.totalScore / max) * 100 : 0;
});
```

## Middleware (Hooks)

### Use Pre/Post Hooks for Cross-Cutting Concerns

```typescript
// Pre-save validation
UserSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    const existing = await User.findOne({ email: this.email });
    if (existing && existing._id.toString() !== this._id.toString()) {
      throw new Error('Email already exists');
    }
  }
  next();
});

// Post-save logging
TestResultSchema.post('save', function(doc) {
  console.log(`Test result ${doc._id} saved`);
});

// Pre-remove cleanup
UserSchema.pre('deleteOne', { document: true }, async function() {
  await TestResult.deleteMany({ userId: this._id });
});
```

## Soft Deletes

### Prefer Soft Deletes Over Hard Deletes

```typescript
const schema = new Schema({
  name: String,
  deletedAt: { type: Date, default: null },
});

// Add method for soft delete
schema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Add query helper to exclude deleted
schema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

// Usage
const activeUsers = await User.find().notDeleted();
```

## Transactions

### Use Transactions for Multi-Document Operations

```typescript
import { startSession } from 'mongoose';

async function createTestWithResult(testData: CreateTestDto) {
  const session = await startSession();

  try {
    session.startTransaction();

    const test = await Test.create([testData], { session });
    const result = await TestResult.create(
      [{ testId: test[0]._id, status: 'pending' }],
      { session }
    );

    await session.commitTransaction();
    return { test: test[0], result: result[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Alternative: withTransaction helper
async function createTestWithResult(testData: CreateTestDto) {
  const session = await startSession();

  const result = await session.withTransaction(async () => {
    const test = await Test.create([testData], { session });
    const result = await TestResult.create(
      [{ testId: test[0]._id }],
      { session }
    );
    return { test: test[0], result: result[0] };
  });

  session.endSession();
  return result;
}
```

## Population

### Use populate() Wisely

```typescript
// Basic population
const testResult = await TestResult.findById(id)
  .populate('schemaId')
  .lean();

// Select specific fields from populated document
const testResult = await TestResult.findById(id)
  .populate('schemaId', 'name questions')
  .lean();

// Nested population
const testResult = await TestResult.findById(id)
  .populate({
    path: 'schemaId',
    select: 'name questions',
    populate: {
      path: 'createdBy',
      select: 'name',
    },
  })
  .lean();
```

### Avoid Deep Population
Deep population causes multiple database queries. Consider:
- Denormalizing frequently accessed data
- Using aggregation pipelines
- Restructuring your data model

## File Organization

### Organize Model Files
Keep models in a dedicated folder:

```
src/models/
├── index.ts           # Export all models
├── ScoringSchema.ts   # One file per model
├── TestResult.ts
└── User.ts
```

### One Schema Per File

```typescript
// models/ScoringSchema.ts
import { Schema, model } from 'mongoose';
import type { IScoringSchema } from '../types';

const ScoringSchemaSchema = new Schema<IScoringSchema>({
  // fields
});

export const ScoringSchema = model('ScoringSchema', ScoringSchemaSchema);

// models/index.ts
export { ScoringSchema } from './ScoringSchema';
export { TestResult } from './TestResult';
export { User } from './User';
```

## Connection Management

### Proper Connection Setup

```typescript
// config/database.ts
import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
```

## Array Size Limits

### Avoid Unbounded Arrays
MongoDB documents have a 16MB limit. Bound arrays or use references:

```typescript
// Bad - unbounded array
const UserSchema = new Schema({
  notifications: [NotificationSchema], // Could grow forever
});

// Good - separate collection with reference
const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  message: String,
  read: Boolean,
});

// Or limit array size
const UserSchema = new Schema({
  recentNotifications: {
    type: [NotificationSchema],
    validate: [arr => arr.length <= 100, 'Too many notifications'],
  },
});
```
