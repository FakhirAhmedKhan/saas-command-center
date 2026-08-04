'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { getErrorMessage } from '@/features/lib/api/api-error';

export default function RegisterPage() {
  const router = useRouter();

  const { register } = useAuth();

  const [displayName, setDisplayName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [workspaceName, setWorkspaceName] =
    useState('');

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      await register({
        displayName:
          displayName.trim() || undefined,
        email,
        password,
        workspaceName,
      });

      router.replace('/dashboard');
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <p className="eyebrow">
          Create your workspace
        </p>

        <h2>Start with the essentials</h2>

        <p>
          Your first workspace is created
          automatically with you as owner.
        </p>
      </div>

      <form
        className="form-stack"
        onSubmit={handleSubmit}
      >
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <label className="field">
          <span>Your name</span>

          <input
            autoComplete="name"
            value={displayName}
            onChange={(event) =>
              setDisplayName(
                event.target.value,
              )
            }
            placeholder="Your display name"
          />
        </label>

        <label className="field">
          <span>Email address</span>

          <input
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>

          <input
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="At least 12 characters"
            minLength={12}
            required
          />

          <small>
            Use at least 12 characters.
          </small>
        </label>

        <label className="field">
          <span>Workspace name</span>

          <input
            value={workspaceName}
            onChange={(event) =>
              setWorkspaceName(
                event.target.value,
              )
            }
            placeholder="My SaaS Portfolio"
            minLength={2}
            required
          />
        </label>

        <button
          className="button button-primary button-full"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? 'Creating workspace…'
            : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}