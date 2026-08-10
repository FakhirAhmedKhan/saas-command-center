import { ApplicationCard } from './application-card';

import type { SaasApplication } from '../application-types';

interface ApplicationsGridProps {
  workspaceId: string;
  applications: SaasApplication[];
}

export function ApplicationsGrid({ workspaceId, applications }: ApplicationsGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {applications.map((application) => (
        <ApplicationCard key={application.id} workspaceId={workspaceId} application={application} />
      ))}
    </div>
  );
}
