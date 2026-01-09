# TailwindCSS Best Practices

Follow these best practices when writing Tailwind CSS in this project.

## Class Organization

### Class Ordering (Concentric CSS)
Order classes consistently for readability:
1. Positioning/visibility (`relative`, `absolute`, `hidden`)
2. Box model (`flex`, `grid`, `w-*`, `h-*`, `p-*`, `m-*`)
3. Borders (`border`, `rounded`)
4. Backgrounds (`bg-*`)
5. Typography (`text-*`, `font-*`)
6. Other visual adjustments (`shadow`, `opacity`)

```tsx
// Good - organized by concern
<div className="relative flex w-full p-4 border rounded-lg bg-white text-gray-800 shadow-md">

// Avoid - random order
<div className="text-gray-800 relative shadow-md w-full border flex bg-white p-4 rounded-lg">
```

### Use Prettier Plugin
Install `prettier-plugin-tailwindcss` to automatically sort classes according to Tailwind's recommended order.

## Component Extraction

### When to Extract Components
- When you repeat the same class combination 3+ times
- When a class string exceeds 10-12 classes
- When styling represents a distinct UI pattern

```tsx
// Good - extracted into a reusable component
function Button({ children, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  };

  return (
    <button className={`${baseClasses} ${variants[variant]}`}>
      {children}
    </button>
  );
}
```

## Conditional Classes

### Use clsx or classnames
For conditional class application, use utility libraries:

```tsx
import clsx from 'clsx';

function Component({ isActive, isDisabled }: Props) {
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded-lg',
        isActive && 'bg-blue-600 text-white',
        isDisabled && 'opacity-50 cursor-not-allowed',
        !isActive && !isDisabled && 'bg-gray-200 hover:bg-gray-300'
      )}
    >
      Click me
    </button>
  );
}
```

## Configuration Best Practices

### Design Tokens in Config
Define colors, spacing, and fonts in `tailwind.config.js` with semantic names:

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: '#6b7280',
        accent: '#10b981',
      },
      spacing: {
        'container': '1200px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};
```

### Content Configuration
Ensure `content` paths in `tailwind.config.js` are correct to enable proper purging:

```js
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
};
```

## Responsive Design

### Mobile-First Approach
Write mobile styles first, then add responsive modifiers:

```tsx
// Good - mobile-first
<div className="flex flex-col md:flex-row lg:gap-8">

// Avoid - desktop-first with max-width
<div className="flex-row max-md:flex-col">
```

### Breakpoint Consistency
Use Tailwind's default breakpoints consistently:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Spacing & Layout

### Consistent Margin Pattern
Use a consistent pattern for margins. Prefer one direction:

```tsx
// Good - consistent mt/ml pattern
<div className="mt-4">
  <h2 className="mt-2">Title</h2>
  <p className="mt-1">Description</p>
</div>

// Or use gap for flex/grid layouts
<div className="flex flex-col gap-4">
  <h2>Title</h2>
  <p>Description</p>
</div>
```

### Use Gap Over Margins
Prefer `gap` utilities in flex/grid layouts:

```tsx
// Good
<div className="flex gap-4">
  <Item />
  <Item />
</div>

// Avoid
<div className="flex">
  <Item className="mr-4" />
  <Item />
</div>
```

## Layer Directives

### Organize Custom CSS
Use `@layer` directives for custom styles:

```css
/* styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply scroll-smooth;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## Common Pitfalls to Avoid

### Don't Forget Accessibility
Tailwind doesn't fix accessibility. Always:
- Use semantic HTML
- Add `aria-*` attributes when needed
- Ensure sufficient color contrast
- Test keyboard navigation

### Avoid Class Duplication
Extract patterns into components rather than copying long class strings.

### Don't Use Arbitrary Values Excessively
Prefer design tokens over arbitrary values:

```tsx
// Good - uses design system
<div className="p-4 text-gray-600">

// Avoid - arbitrary values break consistency
<div className="p-[17px] text-[#555]">
```

## Tooling

### Required Extensions
- Tailwind CSS IntelliSense (VS Code) - autocomplete, syntax highlighting
- Prettier with `prettier-plugin-tailwindcss` - automatic class sorting

### Recommended Plugins
- `@tailwindcss/forms` - better form styles
- `@tailwindcss/typography` - prose styling
- `@tailwindcss/container-queries` - container queries support
