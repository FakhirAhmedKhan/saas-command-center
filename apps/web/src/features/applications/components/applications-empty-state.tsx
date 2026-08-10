import { Boxes, FilterX, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface ApplicationsEmptyStateProps {
  workspaceId: string;
  hasActiveFilters: boolean;
  isArchivedView: boolean;
  onClearFilters: () => void;
}

export function ApplicationsEmptyState({ workspaceId, hasActiveFilters, isArchivedView, onClearFilters }: ApplicationsEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <EmptyState
        icon={<FilterX className='size-6' />}
        title='No applications match these filters'
        description='Try adjusting or clearing your filters to see more results.'
        action={
          <Button variant='outline' onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  if (isArchivedView) {
    return <EmptyState icon={<Boxes className='size-6' />} title='No archived applications' description='Archived applications will appear here.' />;
  }

  return (
    <EmptyState
      icon={<Boxes className='size-6' />}
      title='No applications yet'
      description='Create your first SaaS application to start tracking development, releases and analytics.'
      action={
        <Link
          href={`/workspaces/${workspaceId}/applications/new`}
          className='inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700'
        >
          <Plus className='size-4' />
          Create application
        </Link>
      }
    />
  );
}
