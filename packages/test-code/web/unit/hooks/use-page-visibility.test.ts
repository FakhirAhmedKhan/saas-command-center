// @vitest-environment jsdom
import { usePageVisibility } from '@/hooks/use-page-visibility';
import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });

  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  setVisibility('visible');
});

describe('usePageVisibility', () => {
  it('reports true while the tab is visible', () => {
    setVisibility('visible');

    const { result } = renderHook(() => usePageVisibility());

    expect(result.current).toBe(true);
  });

  it('reports false once the tab is hidden', () => {
    const { result } = renderHook(() => usePageVisibility());

    act(() => {
      setVisibility('hidden');
    });

    expect(result.current).toBe(false);
  });

  it('reports true again once the tab becomes visible', () => {
    const { result } = renderHook(() => usePageVisibility());

    act(() => {
      setVisibility('hidden');
    });

    expect(result.current).toBe(false);

    act(() => {
      setVisibility('visible');
    });

    expect(result.current).toBe(true);
  });
});
