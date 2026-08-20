import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ensure component trees mounted by one test don't leak into the next.
afterEach(() => {
  cleanup();
});
