# Frontend Testing Guide

## Suggested Testing Setup

### Install Testing Dependencies

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
```

### Configure Jest

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom';
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Suggested Test Cases

### 1. Authentication Tests

**File: `src/__tests__/auth/Login.test.tsx`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { AuthProvider } from '@/context/AuthContext';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('Login Page', () => {
  it('renders login form', () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows error message for invalid credentials', async () => {
    const { api } = require('@/lib/api');
    api.post.mockRejectedValue({ response: { status: 401 } });
    
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Booking Form Tests

**File: `src/__tests__/booking/BookingForm.test.tsx`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookPage from '@/app/dashboard/book/page';
import { AuthProvider } from '@/context/AuthContext';

jest.mock('@/lib/api');

describe('Booking Page', () => {
  it('renders date picker and time slots', () => {
    render(
      <AuthProvider>
        <BookPage />
      </AuthProvider>
    );
    
    expect(screen.getByText(/select a date/i)).toBeInTheDocument();
  });

  it('shows available slots for selected date', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        current_bookings: 5,
        max_capacity: 20,
        available_spots: 15,
      },
    });
    
    render(
      <AuthProvider>
        <BookPage />
      </AuthProvider>
    );
    
    // Select a date
    const dateButton = screen.getByRole('button', { name: /tomorrow/i });
    fireEvent.click(dateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/15 spots available/i)).toBeInTheDocument();
    });
  });

  it('disables booking button when slot is full', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        current_bookings: 20,
        max_capacity: 20,
        available_spots: 0,
      },
    });
    
    render(
      <AuthProvider>
        <BookPage />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /book/i })).toBeDisabled();
    });
  });
});
```

### 3. Error Handling Tests

**File: `src/__tests__/booking/ErrorHandling.test.tsx`**

```typescript
describe('Booking Error Handling', () => {
  it('displays CAPACITY_EXCEEDED error correctly', async () => {
    const { api } = require('@/lib/api');
    api.post.mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: 'Time slot is full',
          error_code: 'CAPACITY_EXCEEDED',
        },
      },
    });
    
    // Test that user-friendly message is shown
    // "This time slot is full. Please choose a different time."
  });

  it('displays MEMBER_OVERLAP error correctly', async () => {
    const { api } = require('@/lib/api');
    api.post.mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: 'You already have a booking',
          error_code: 'MEMBER_OVERLAP',
        },
      },
    });
    
    // Test that user-friendly message is shown
    // "You already have a booking during this time."
  });
});
```

### 4. Admin Dashboard Tests

**File: `src/__tests__/admin/MemberManagement.test.tsx`**

```typescript
describe('Admin Member Management', () => {
  it('lists all members with status badges', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        members: [
          { id: '1', full_name: 'John Doe', membership_status: 'active' },
          { id: '2', full_name: 'Jane Doe', membership_status: 'pending' },
        ],
        total: 2,
      },
    });
    
    // Verify members are displayed with correct status
  });

  it('allows approving pending members', async () => {
    // Test approve button functionality
  });

  it('allows suspending active members', async () => {
    // Test suspend button functionality
  });
});
```

### 5. Component Unit Tests

**File: `src/__tests__/components/Button.test.tsx`**

```typescript
import { render, screen } from '@testing-library/react';
import Button from '@/components/Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies loading state correctly', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });
});
```

---

## End-to-End Tests (Playwright)

### Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Example E2E Test

**File: `e2e/booking-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'member@gaelic.club');
    await page.fill('input[name="password"]', 'member123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('complete booking flow', async ({ page }) => {
    // Navigate to booking page
    await page.click('text=Book Gym Time');
    await expect(page).toHaveURL('/dashboard/book');

    // Select a date
    await page.click('.date-picker-tomorrow');

    // Select a time slot
    await page.click('.time-slot-9am');

    // Confirm booking
    await page.click('button:has-text("Confirm Booking")');

    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Booking confirmed');
  });

  test('shows error when slot is full', async ({ page }) => {
    await page.goto('/dashboard/book');
    
    // Try to book a full slot (mocked)
    await page.click('.full-slot');
    
    await expect(page.locator('.error-message')).toContainText('slot is full');
  });
});
```

---

## Test Coverage Goals

| Area | Target Coverage | Priority |
|------|-----------------|----------|
| Authentication | 90% | High |
| Booking Logic | 95% | High |
| Error Handling | 85% | High |
| Admin Functions | 80% | Medium |
| UI Components | 70% | Medium |
| Utilities | 80% | Low |

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/__tests__/auth/Login.test.tsx

# Run in watch mode
npm test -- --watch

# Run E2E tests
npx playwright test
```
