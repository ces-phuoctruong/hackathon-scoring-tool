# React Best Practices

Follow these best practices when writing React code in this project.

## Component Patterns

### Use Functional Components
- Function components are the standard for React development
- Prefer hooks over class components for all use cases
- Keep components small and focused on a single responsibility

### Component Naming
- Use PascalCase for component names (e.g., `UserProfile`, `SchemaBuilder`)
- Use camelCase for variables and functions
- Name files the same as the component they export

### Component Structure
```tsx
// Good component structure
import { useState, useEffect } from 'react';
import type { ComponentProps } from './types';

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks first
  const [state, setState] = useState(initialValue);

  // 2. Effects
  useEffect(() => {
    // side effects
  }, [dependencies]);

  // 3. Event handlers
  const handleClick = () => {};

  // 4. Render helpers (if needed)
  const renderItem = (item: Item) => <div>{item.name}</div>;

  // 5. Return JSX
  return <div>{/* JSX */}</div>;
}
```

## State Management

### Local State
- Use `useState` for component-local state
- Move state to the component that needs it (avoid prop drilling)
- Only lift state when multiple components need it

### Server State
- Use React Query or similar for server state management
- Separate server state from UI state
- Handle loading, error, and success states explicitly

### Optimization Hooks
- Use `useMemo` for expensive calculations
- Use `useCallback` for functions passed as props
- Use `React.memo` for components that render often with same props
- Don't over-optimize - measure first

```tsx
// Only memoize when needed
const expensiveResult = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleSubmit = useCallback((data: FormData) => {
  submitForm(data);
}, [submitForm]);
```

## Performance Best Practices

### Code Splitting
- Use dynamic imports for route-level code splitting
- Lazy load components that aren't immediately needed
```tsx
const LazyComponent = lazy(() => import('./HeavyComponent'));
```

### Avoid Unnecessary Renders
- Don't create objects/arrays in render that could be memoized
- Avoid inline function definitions in JSX when possible
- Use key props correctly (never use index for dynamic lists)

### Bundle Size
- Import only what you need from libraries
- Use tree-shaking compatible imports
```tsx
// Good
import { Button } from '@/components/ui/button';

// Avoid
import * as UI from '@/components/ui';
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components
│   └── forms/       # Form-specific components
├── hooks/           # Custom hooks
├── pages/           # Page components
├── services/        # API clients
├── types/           # TypeScript types
├── utils/           # Utility functions
└── App.tsx
```

## Custom Hooks

### When to Create Custom Hooks
- Extract logic shared between components
- Encapsulate complex state logic
- Wrap side effects (API calls, subscriptions)

```tsx
// Example: Custom hook for API data
function useApiData<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData(endpoint)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, loading, error };
}
```

## Error Handling

### Error Boundaries
- Use error boundaries to catch rendering errors
- Provide fallback UI for error states
- Log errors for debugging

### Async Error Handling
- Always handle promise rejections
- Show user-friendly error messages
- Provide retry mechanisms when appropriate

## Testing Guidelines

- Test user behavior, not implementation details
- Use React Testing Library
- Write tests that mirror user interactions
- Don't test internal state directly

```tsx
// Good test example
test('submits form with valid data', async () => {
  render(<FormComponent />);

  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## Accessibility

- Use semantic HTML elements
- Add proper ARIA attributes when needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain proper heading hierarchy
