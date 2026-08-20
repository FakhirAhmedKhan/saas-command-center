import { GuestOnly } from '@/features/auth/auth-gates';
import Image from 'next/image';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <GuestOnly>
      <main className='flex min-h-screen w-full bg-app-bg'>
        <section className='hidden w-[42%] max-w-md flex-col justify-between bg-slate-950 px-10 py-10 text-white lg:flex'>
          <span className='flex items-center gap-2.5 text-sm font-semibold'>
            <span className='flex size-7 shrink-0 items-center justify-center rounded-m text-[11px] font-bold text-slate-950'>
            </span>
            <Image src='/icon.svg' alt='SaaS Command Center' width={50} height={50} />

            SaaS Command Center
          </span>

          <div>
            <h1 className='text-3xl font-semibold leading-tight tracking-tight'>Know what needs your attention.</h1>

            <p className='mt-3 max-w-xs text-sm leading-6 text-slate-400'>One place for every SaaS product you operate.</p>
          </div>

          <p className='text-xs text-slate-500'>&copy; {new Date().getFullYear()} SaaS Command Center</p>
        </section>

        <section className='flex flex-1 items-center justify-center px-6 py-10 sm:px-10'>
          <div className='w-full max-w-sm'>{children}</div>
        </section>
      </main>
    </GuestOnly>
  );
}
