'use client';

import { useState, type FormEvent } from 'react';

import { Pencil, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import {
  addApplicationTechnology,
  removeApplicationTechnology,
  updateApplicationTechnology,
} from '../application-api';

import {
  TECHNOLOGY_TYPES,
  type ApplicationTechnology,
  type TechnologyType,
} from '../application-types';

import { TECHNOLOGY_TYPE_LABELS } from '../application-constants';
import { getErrorMessage } from '../application-utils';

interface TechnologyManagerProps {
  workspaceId: string;
  applicationId: string;
  technologies: ApplicationTechnology[];
  disabled?: boolean;
  onChanged: () => void;
}

export function TechnologyManager({
  workspaceId,
  applicationId,
  technologies,
  disabled = false,
  onChanged,
}: TechnologyManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<TechnologyType>('FRONTEND');
  const [version, setVersion] = useState('');

  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  function resetForm(): void {
    setEditingId(null);
    setName('');
    setType('FRONTEND');
    setVersion('');
    setError(null);
  }

  function beginEdit(technology: ApplicationTechnology): void {
    setEditingId(technology.id);
    setName(technology.name);
    setType(technology.type);
    setVersion(technology.version ?? '');
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!name.trim()) {
      setError('Technology name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        type,
        version: version.trim() || null,
      };

      if (editingId) {
        await updateApplicationTechnology(workspaceId, applicationId, editingId, payload);
      } else {
        await addApplicationTechnology(workspaceId, applicationId, payload);
      }

      resetForm();
      onChanged();
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'Unable to save technology.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(technology: ApplicationTechnology): Promise<void> {
    const confirmed = window.confirm(`Remove ${technology.name}?`);

    if (!confirmed) {
      return;
    }

    setBusyId(technology.id);
    setError(null);

    try {
      await removeApplicationTechnology(workspaceId, applicationId, technology.id);

      onChanged();
    } catch (removeError: unknown) {
      setError(getErrorMessage(removeError, 'Unable to remove technology.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-950">Technology stack</h2>

        <p className="mt-1 text-sm text-slate-500">
          Track the frameworks, platforms, databases and infrastructure used by this application.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {disabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Restore this application before modifying its technology stack.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto]"
          >
            <Input
              aria-label="Technology name"
              placeholder="Next.js"
              value={name}
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
            />

            <Select
              aria-label="Technology type"
              value={type}
              disabled={saving}
              onChange={(event) => setType(event.target.value as TechnologyType)}
            >
              {TECHNOLOGY_TYPES.map((technologyType) => (
                <option key={technologyType} value={technologyType}>
                  {TECHNOLOGY_TYPE_LABELS[technologyType]}
                </option>
              ))}
            </Select>

            <Input
              aria-label="Technology version"
              placeholder="Version"
              value={version}
              disabled={saving}
              onChange={(event) => setVersion(event.target.value)}
            />

            <div className="flex gap-2">
              <Button type="submit" loading={saving} className="flex-1">
                {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}

                {editingId ? 'Update' : 'Add'}
              </Button>

              {editingId ? (
                <Button type="button" variant="ghost" size="icon" onClick={resetForm}>
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </form>
        )}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {technologies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            No technologies have been added.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {technologies.map((technology) => (
              <div
                key={technology.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{technology.name}</p>

                    <Badge variant="slate">{TECHNOLOGY_TYPE_LABELS[technology.type]}</Badge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {technology.version ? `Version ${technology.version}` : 'Version not specified'}
                  </p>
                </div>

                {!disabled ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busyId === technology.id}
                      onClick={() => beginEdit(technology)}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busyId === technology.id}
                      onClick={() => void handleRemove(technology)}
                    >
                      <Trash2 className="size-4 text-red-600" />
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
