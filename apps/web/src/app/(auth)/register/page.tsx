'use client';

import { useState } from 'react';

import type { FormEvent } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { useSession } from '@/features/auth/use-session';
import { getErrorMessage } from '@/features/lib/api/api-error';

export default function RegisterPage() {
  const router = useRouter();

  const { register } = useSession();

  const [name, setName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        workspaceName: '',
      });

      router.replace('/dashboard');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold">Create your account</h1>

        <p className="mt-2 text-sm text-slate-600">Start managing your SaaS applications.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>

            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-slate-950 underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
