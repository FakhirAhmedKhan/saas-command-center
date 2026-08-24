'use client';

import { useSession } from '@/features/auth/use-session';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { Button, Input } from '@command-center/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      await login({
        email,
        password,
      });

      const nextPath = searchParams.get('next');

      router.replace(nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className='text-xl font-semibold text-slate-950'>Welcome back</h1>

      <p className='mt-1.5 text-sm text-slate-500'>Sign in to your command center.</p>

      <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
        <Input id='email' type='email' label='Email' autoComplete='email' required value={email} onChange={(event) => setEmail(event.target.value)} />

        <Input id='password' type='password' label='Password' autoComplete='current-password' required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />

        {error ? (
          <div role='alert' className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>
            {error}
          </div>
        ) : null}

        <Button type='submit' size='lg' loading={submitting} className='w-full'>
          Sign in
        </Button>
      </form>

      <p className='mt-5 text-center text-sm text-slate-500'>
        No account?{' '}
        <Link href='/register' className='font-medium text-brand-700 hover:text-brand-800'>
          Create one
        </Link>
      </p>
    </div>
  );
}
