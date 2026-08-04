'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { getErrorMessage } from '@/features/lib/api/api-error';
export default function LoginPage() {
  const router = useRouter();

  const { login } = useAuth();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
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
      await login({
        email,
        password,
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
        <p className="eyebrow">Welcome back</p>

        <h2>Sign in to continue</h2>

        <p>
          Access your projects and workspace
          overview.
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
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            required
          />
        </label>

        <button
          className="button button-primary button-full"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? 'Signing in…'
            : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to SaaS Command Center?{' '}
        <Link href="/register">
          Create an account
        </Link>
      </p>
    </div>
  );
}