'use client';

import { useEffect, useState } from 'react';

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

/**
 * Tracks whether the current tab is the visible one, so polling effects can
 * pause while it is backgrounded and resume (with an immediate refresh) when
 * it becomes visible again.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(isDocumentVisible);

  useEffect(() => {
    function handleVisibilityChange(): void {
      setVisible(isDocumentVisible());
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return visible;
}
