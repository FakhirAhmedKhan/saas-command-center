'use client';

import { ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addApplicationLink, removeApplicationLink, updateApplicationLink } from '../application-api';
import { LINK_TYPE_LABELS } from '../application-constants';
import { APPLICATION_LINK_TYPES, type ApplicationLink, type ApplicationLinkType } from '../application-types';
import { getErrorMessage } from '../application-utils';

interface LinkManagerProps {
  workspaceId: string;
  applicationId: string;
  links: ApplicationLink[];
  disabled?: boolean;
  onChanged: () => void;
}

export function LinkManager({ workspaceId, applicationId, links, disabled = false, onChanged }: LinkManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const [label, setLabel] = useState('');

  const [type, setType] = useState<ApplicationLinkType>('PRODUCTION');

  const [url, setUrl] = useState('');

  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  function resetForm(): void {
    setEditingId(null);
    setLabel('');
    setType('PRODUCTION');
    setUrl('');
    setError(null);
  }

  function beginEdit(link: ApplicationLink): void {
    setEditingId(link.id);
    setLabel(link.label);
    setType(link.type);
    setUrl(link.url);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!label.trim() || !url.trim()) {
      setError('Link label and URL are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        label: label.trim(),
        type,
        url: url.trim(),
      };

      if (editingId) {
        await updateApplicationLink(workspaceId, applicationId, editingId, payload);
      } else {
        await addApplicationLink(workspaceId, applicationId, payload);
      }

      resetForm();
      onChanged();
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'Unable to save application link.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(link: ApplicationLink): Promise<void> {
    const confirmed = window.confirm(`Remove ${link.label}?`);

    if (!confirmed) {
      return;
    }

    setBusyId(link.id);
    setError(null);

    try {
      await removeApplicationLink(workspaceId, applicationId, link.id);

      onChanged();
    } catch (removeError: unknown) {
      setError(getErrorMessage(removeError, 'Unable to remove application link.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className='text-lg font-semibold text-slate-950'>Important links</h2>

        <p className='mt-1 text-sm text-slate-500'>Store production, repository, staging, documentation and design links.</p>
      </CardHeader>

      <CardContent className='space-y-6'>
        {disabled ? (
          <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            Restore this application before modifying its links.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='grid gap-4 rounded-2xl bg-slate-50 p-4 xl:grid-cols-[200px_180px_minmax(240px,1fr)_auto]'>
            <Input
              aria-label='Link label'
              placeholder='Production website'
              value={label}
              disabled={saving}
              onChange={(event) => setLabel(event.target.value)}
            />

            <Select aria-label='Link type' value={type} disabled={saving} onChange={(event) => setType(event.target.value as ApplicationLinkType)}>
              {APPLICATION_LINK_TYPES.map((linkType) => (
                <option key={linkType} value={linkType}>
                  {LINK_TYPE_LABELS[linkType]}
                </option>
              ))}
            </Select>

            <Input
              aria-label='Link URL'
              type='url'
              placeholder='https://example.com'
              value={url}
              disabled={saving}
              onChange={(event) => setUrl(event.target.value)}
            />

            <div className='flex gap-2'>
              <Button type='submit' loading={saving} className='flex-1'>
                {editingId ? <Pencil className='size-4' /> : <Plus className='size-4' />}

                {editingId ? 'Update' : 'Add'}
              </Button>

              {editingId ? (
                <Button type='button' variant='ghost' size='icon' onClick={resetForm}>
                  <X className='size-4' />
                </Button>
              ) : null}
            </div>
          </form>
        )}

        {error ? <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div> : null}

        {links.length === 0 ? (
          <p className='rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500'>No application links have been added.</p>
        ) : (
          <div className='divide-y divide-slate-100'>
            {links.map((link) => (
              <div key={link.id} className='flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center'>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-semibold text-slate-900'>{link.label}</p>

                    <Badge variant='slate'>{LINK_TYPE_LABELS[link.type]}</Badge>
                  </div>

                  <a
                    href={link.url}
                    target='_blank'
                    rel='noreferrer'
                    className='mt-1 inline-flex max-w-full items-center gap-1 text-sm text-brand-700 hover:underline'
                  >
                    <span className='truncate'>{link.url}</span>

                    <ExternalLink className='size-3.5 shrink-0' />
                  </a>
                </div>

                {!disabled ? (
                  <div className='flex gap-2'>
                    <Button type='button' variant='ghost' size='icon' disabled={busyId === link.id} onClick={() => beginEdit(link)}>
                      <Pencil className='size-4' />
                    </Button>

                    <Button type='button' variant='ghost' size='icon' disabled={busyId === link.id} onClick={() => void handleRemove(link)}>
                      <Trash2 className='size-4 text-red-600' />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
