import { Suspense } from 'react';
import NewWorkspaceClient from './new-workspace-client';

export default function NewWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading workspace...
          </p>
        </div>
      }
    >
      <NewWorkspaceClient />
    </Suspense>
  );
}
