'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        displayName: name.trim() || undefined,
        email: email.trim(),
        password,
      });

      router.replace('/workspaces/new');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className='text-xl font-semibold text-slate-950'>Create your account</h1>

      <p className='mt-1.5 text-sm text-slate-500'>Start managing your SaaS applications.</p>

      <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
        <Input id='name' type='text' label='Name' autoComplete='name' required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />

        <Input id='email' type='email' label='Email' autoComplete='email' required value={email} onChange={(event) => setEmail(event.target.value)} />

        <Input
          id='password'
          type='password'
          label='Password'
          hint='At least 8 characters.'
          autoComplete='new-password'
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? (
          <div role='alert' className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>
            {error}
          </div>
        ) : null}

        <Button type='submit' size='lg' loading={submitting} className='w-full'>
          Create account
        </Button>
      </form>

      <p className='mt-5 text-center text-sm text-slate-500'>
        Already registered?{' '}
        <Link href='/login' className='font-medium text-brand-700 hover:text-brand-800'>
          Sign in
        </Link>
      </p>
    </div>
  );
}
