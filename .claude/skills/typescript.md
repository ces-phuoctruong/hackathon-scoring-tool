# TypeScript Best Practices

Follow these best practices when writing TypeScript code in this project.

## Type Safety Configuration

### Strict Mode
Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Never Use `any`
- Using `any` opts out of type checking
- Prefer `unknown` when type is truly unknown
- Use type narrowing with `unknown`

```typescript
// Bad
function process(data: any) {
  return data.value; // No type safety
}

// Good
function process(data: unknown) {
  if (isValidData(data)) {
    return data.value; // Type-safe after narrowing
  }
  throw new Error('Invalid data');
}
```

## Type Inference

### Let TypeScript Infer When Possible
Don't over-annotate when TypeScript can infer types:

```typescript
// Unnecessary - TypeScript infers this
const name: string = 'John';
const numbers: number[] = [1, 2, 3];

// Better - let TypeScript infer
const name = 'John';
const numbers = [1, 2, 3];

// Do annotate function parameters and return types
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Annotate Function Signatures
Always annotate function parameters and return types for public APIs:

```typescript
// Good - explicit contract
export function fetchUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}
```

## Advanced Type Features

### Discriminated Unions
Use discriminated unions for complex data modeling:

```typescript
type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
  | { status: 'loading' };

function handleResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case 'success':
      return response.data; // TypeScript knows data exists
    case 'error':
      throw new Error(response.error);
    case 'loading':
      return null;
  }
}
```

### Template Literal Types
Use template literal types for string patterns:

```typescript
type EventName = `on${Capitalize<string>}`;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/api/${string}`;
```

### Const Assertions
Use `as const` for immutable values:

```typescript
// Type is readonly ["admin", "user", "guest"]
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // "admin" | "user" | "guest"

const CONFIG = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} as const;
```

## Naming Conventions

### Types and Interfaces
- Use PascalCase for type names
- Prefix interfaces with `I` only if it's a project convention
- Prefer `type` for unions, `interface` for objects that may be extended

```typescript
// Types
type UserId = string;
type Status = 'active' | 'inactive';

// Interfaces
interface User {
  id: UserId;
  name: string;
  status: Status;
}

// Extending interfaces
interface AdminUser extends User {
  permissions: string[];
}
```

### Constants
Use UPPER_CASE for global constants:

```typescript
const MAX_RETRIES = 3;
const API_BASE_URL = '/api/v1';
```

## Utility Types

### Use Built-in Utility Types
Leverage TypeScript's utility types:

```typescript
// Partial - all properties optional
type PartialUser = Partial<User>;

// Required - all properties required
type RequiredUser = Required<User>;

// Pick - select properties
type UserName = Pick<User, 'id' | 'name'>;

// Omit - exclude properties
type UserWithoutId = Omit<User, 'id'>;

// Record - typed object
type UserMap = Record<string, User>;

// Readonly - immutable
type ImmutableUser = Readonly<User>;
```

### Create Custom Utility Types
Build project-specific utilities:

```typescript
// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract nullable types
type Nullable<T> = T | null;

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

## Runtime Validation

### Use Validation Libraries
Complement compile-time checks with runtime validation:

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

// Infer type from schema
type User = z.infer<typeof UserSchema>;

// Validate at runtime
function createUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

## Error Handling

### Use Result Types Instead of Throwing
Prefer explicit error handling:

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await api.get(`/users/${id}`);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Usage
const result = await fetchUser('123');
if (result.success) {
  console.log(result.data.name);
} else {
  console.error(result.error.message);
}
```

## Import/Export Patterns

### No Default Exports
Prefer named exports for consistency:

```typescript
// Good - named exports
export function createUser() {}
export const USER_ROLES = ['admin', 'user'] as const;
export type User = { id: string };

// Avoid - default exports
export default function createUser() {}
```

### Type-Only Imports
Use type-only imports when importing only types:

```typescript
import type { User, Role } from './types';
import { createUser } from './users';
```

## Tooling

### ESLint Configuration
Use `typescript-eslint` for type-aware linting:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ]
}
```

### Recommended Rules
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/explicit-function-return-type`
- `@typescript-eslint/no-unused-vars`
- `@typescript-eslint/consistent-type-imports`

## Generic Best Practices

### Constrain Generics Appropriately

```typescript
// Too loose
function getProperty<T>(obj: T, key: string) {}

// Better - constrained
function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}
```

### Use Descriptive Generic Names

```typescript
// Single letters for simple cases
function identity<T>(value: T): T {}

// Descriptive names for complex cases
function merge<TSource, TTarget>(source: TSource, target: TTarget) {}
```
