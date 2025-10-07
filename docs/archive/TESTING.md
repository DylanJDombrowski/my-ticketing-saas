# Testing Guide

This project uses Jest and React Testing Library for unit and integration testing.

## Setup

The testing framework has been configured with:

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **jest-environment-jsdom**: DOM environment for testing React components
- **@testing-library/jest-dom**: Custom Jest matchers for DOM elements
- **@testing-library/user-event**: User interaction simulation

## Configuration

### Jest Configuration (`jest.config.js`)
- Configured for Next.js with `next/jest`
- TypeScript support
- Module path mapping for `@/` imports
- JSDOM test environment
- Coverage thresholds set to 70%
- Automatic mocking of CSS and static files

### Setup File (`jest.setup.js`)
- Imports `@testing-library/jest-dom` for custom matchers
- Mocks Next.js router functions
- Mocks Supabase client and server
- Mocks Zustand stores
- Mocks notification system
- Sets up `matchMedia` for responsive tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Component Tests (`src/components/__tests__/`)
Test React components in isolation with mocked dependencies.

**Example: Auth Guard Component**
```typescript
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth'
import { AuthGuard } from '@/components/auth-guard'

jest.mock('@/stores/auth')

describe('AuthGuard', () => {
  it('renders children when user is authenticated', () => {
    // Test implementation
  })
})
```

### Store Tests (`src/stores/__tests__/`)
Test Zustand store logic and state management.

**Example: Auth Store**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth'

describe('Auth Store', () => {
  it('initializes with default state', () => {
    // Test implementation
  })
})
```

### Utility Tests (`src/lib/__tests__/`)
Test utility functions and type definitions.

## Testing Patterns

### 1. Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Test user interactions
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'text')

// Test component rendering
expect(screen.getByText('Expected Text')).toBeInTheDocument()
expect(screen.queryByText('Hidden Text')).not.toBeInTheDocument()
```

### 2. Store Testing
```typescript
import { renderHook, act } from '@testing-library/react'

const { result } = renderHook(() => useStore())

await act(async () => {
  await result.current.someAsyncAction()
})

expect(result.current.state).toEqual(expectedState)
```

### 3. Async Testing
```typescript
import { waitFor } from '@testing-library/react'

await waitFor(() => {
  expect(screen.getByText('Loaded Content')).toBeInTheDocument()
})
```

### 4. Mocking External Dependencies
```typescript
// Mock API calls
jest.mock('@/lib/supabase', () => ({
  createBrowserClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    })),
  })),
}))

// Mock store state
jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn(() => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
  })),
}))
```

## Test Coverage

The project is configured with coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Coverage excludes:
- Type definition files (`.d.ts`)
- Layout files
- CSS files
- UI component library files

## Best Practices

### 1. Test Behavior, Not Implementation
```typescript
// ✅ Good - tests user behavior
expect(screen.getByText('Welcome, John')).toBeInTheDocument()

// ❌ Bad - tests implementation details
expect(component.state.userName).toBe('John')
```

### 2. Use Semantic Queries
```typescript
// ✅ Preferred query methods (in order)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
screen.getByPlaceholderText(/enter email/i)
screen.getByText(/welcome/i)

// ❌ Avoid unless necessary
screen.getByTestId('submit-button')
```

### 3. Clean Up Between Tests
```typescript
beforeEach(() => {
  jest.clearAllMocks()
})
```

### 4. Test Error States
```typescript
it('handles API errors gracefully', async () => {
  mockSupabase.from().select.mockRejectedValue(new Error('API Error'))

  render(<Component />)

  await waitFor(() => {
    expect(screen.getByText(/error occurred/i)).toBeInTheDocument()
  })
})
```

## Debugging Tests

### View Rendered Output
```typescript
import { screen } from '@testing-library/react'

// Debug current DOM state
screen.debug()

// Debug specific element
screen.debug(screen.getByTestId('component'))
```

### Test Queries
```typescript
// Find available queries for an element
screen.logTestingPlaygroundURL()
```

## CI/CD Integration

Tests are configured to run in CI environments with:
- Coverage reporting
- JUnit output format
- Proper exit codes for build systems

Add to your CI pipeline:
```bash
npm test -- --coverage --watchAll=false --ci
```

## Future Enhancements

Consider adding:
- E2E tests with Playwright or Cypress
- Visual regression testing
- Performance testing
- API integration tests
- Database testing with test containers