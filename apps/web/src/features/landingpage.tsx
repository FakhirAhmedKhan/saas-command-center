import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SaaS Command Center â€” Run Your SaaS From One Place',
  description:
    'Connect repositories, applications, deployments, monitoring, analytics, infrastructure, and teams inside one centralized SaaS operations workspace.',
};

type IconProps = {
  className?: string;
};

const IconArrowRight = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='M5 12h14M13 6l6 6-6 6' />
  </svg>
);

const IconChevronDown = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='m6 9 6 6 6-6' />
  </svg>
);

const IconMenu = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className={className} aria-hidden='true'>
    <path strokeLinecap='round' d='M5 7h14M5 12h14M5 17h14' />
  </svg>
);

const IconGitHub = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z' />
  </svg>
);

const IconCheck = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='m5 12.5 4.2 4.2L19 7' />
  </svg>
);

const IconBranch = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <circle cx='6' cy='5' r='2' />
    <circle cx='6' cy='19' r='2' />
    <circle cx='18' cy='7' r='2' />
    <path strokeLinecap='round' d='M6 7v10M8 14h3a7 7 0 0 0 7-5' />
  </svg>
);

const IconPulse = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='M3 12h4l2.2-5.5 4.2 11L16 12h5' />
  </svg>
);

const IconShield = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z' />
    <path strokeLinecap='round' strokeLinejoin='round' d='m9.2 12 1.8 1.8 3.8-4' />
  </svg>
);

const IconDatabase = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <ellipse cx='12' cy='5' rx='8' ry='3' />
    <path d='M4 5v6c0 1.65 3.58 3 8 3s8-1.35 8-3V5' />
    <path d='M4 11v6c0 1.65 3.58 3 8 3s8-1.35 8-3v-6' />
  </svg>
);

const IconStack = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='m12 3 9 5-9 5-9-5 9-5Z' />
    <path strokeLinecap='round' strokeLinejoin='round' d='m3 12 9 5 9-5' />
    <path strokeLinecap='round' strokeLinejoin='round' d='m3 16 9 5 9-5' />
  </svg>
);

const IconTerminal = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <rect x='3' y='4' width='18' height='16' rx='2' />
    <path strokeLinecap='round' strokeLinejoin='round' d='m7 9 3 3-3 3M13 15h4' />
  </svg>
);

const IconUsers = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <circle cx='9' cy='8' r='3' />
    <path strokeLinecap='round' d='M3.5 19c.5-3.1 2.4-5 5.5-5s5 1.9 5.5 5' />
    <path strokeLinecap='round' d='M16 5.5a3 3 0 0 1 0 5M16 14c2.8.2 4.3 1.8 4.5 4' />
  </svg>
);

const IconBolt = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='M13 2 5 13h6l-1 9 9-13h-6V2Z' />
  </svg>
);

const IconCode = ({ className }: IconProps) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' className={className} aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' d='m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14' />
  </svg>
);

function LogoMark() {
  return (
    <div className='relative h-8 w-8 overflow-hidden rounded-xl'>
      <Image src='/icon.svg' alt='SaaS Command Center' className='h-full w-full object-contain' width={32} height={32} />
    </div>
  );
}

function SectionEyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300 ${center ? 'justify-center' : ''}`}>
      <span className='h-px w-6 bg-blue-400/60' />
      {children}
    </div>
  );
}

function Navbar() {
  return (
    <header className='fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#05070b]/70 backdrop-blur-2xl'>
      <div className='mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8'>
        <Link href='/' className='group flex items-center gap-3'>
          <LogoMark />

          {/* <Architecture className='h-6 w-auto text-white transition group-hover:text-blue-400' /> */}
          <div className='leading-none'>
            <div className='text-[14px] font-semibold tracking-[-0.02em] text-white'>SaaS Command Center</div>
            <div className='mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600'>Operations Platform</div>
          </div>
        </Link>

        <nav className='hidden items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.025] p-1 md:flex'>
          {(
            [
              ['Features', '#features'],
              ['Workflow', '#workflow'],
              ['Integrations', '#integrations'],
              ['Security', '#security'],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className='rounded-full px-4 py-2 text-[13px] font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white'
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className='flex items-center gap-2'>
          <Link href='/login' className='hidden rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-white sm:block'>
            Sign in
          </Link>

          <Link
            href='/register'
            className='hidden items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-600 sm:flex'
          >
            Get started
            <IconArrowRight className='h-4 w-4' />
          </Link>

          <details className='group relative sm:hidden'>
            <summary className='flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white'>
              <IconMenu className='h-5 w-5' />
            </summary>

            <div className='absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14]/95 p-2 shadow-2xl backdrop-blur-2xl'>
              <div className='flex flex-col'>
                {(
                  [
                    ['Features', '#features'],
                    ['Workflow', '#workflow'],
                    ['Integrations', '#integrations'],
                    ['Security', '#security'],
                  ] as const
                ).map(([label, href]) => (
                  <Link key={href} href={href} className='rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white'>
                    {label}
                  </Link>
                ))}

                <div className='my-2 h-px bg-white/10' />

                <Link href='/login' className='rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white'>
                  Sign in
                </Link>

                <Link href='/register' className='mt-1 rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-black'>
                  Create workspace
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function StatusPill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'violet' }) {
  const toneClass = {
    green: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
    blue: 'border-blue-400/20 bg-blue-400/[0.08] text-blue-300',
    violet: 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${toneClass}`}>
      <span className='h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]' />
      {children}
    </span>
  );
}

function HeroDashboard() {
  const bars = [31, 48, 43, 63, 55, 82, 67, 88, 75, 94, 79, 92];

  return (
    <div id='demo' className='relative mx-auto mt-16 w-full max-w-[1180px] sm:mt-20'>
      <div className='absolute -inset-8 -z-10 rounded-[50%] bg-blue-600/10 blur-[100px]' />

      <div className='overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#080a0f] shadow-[0_50px_160px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.025)]'>
        <div className='flex h-12 items-center justify-between border-b border-white/[0.07] bg-white/[0.018] px-4 sm:px-5'>
          <div className='flex items-center gap-2'>
            <span className='h-2.5 w-2.5 rounded-full bg-white/10' />
            <span className='h-2.5 w-2.5 rounded-full bg-white/10' />
            <span className='h-2.5 w-2.5 rounded-full bg-white/10' />
          </div>

          <div className='hidden items-center gap-2 text-[11px] font-medium text-zinc-500 sm:flex'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
            All systems operational
          </div>

          <div className='rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-zinc-600'>production</div>
        </div>

        <div className='grid min-h-[580px] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]'>
          <aside className='hidden border-r border-white/[0.06] bg-black/20 p-4 lg:block'>
            <div className='mb-7 flex items-center gap-2 px-2'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300'>
                <IconStack className='h-4 w-4' />
              </div>
              <div>
                <div className='text-xs font-medium text-white'>Acme Cloud</div>
                <div className='text-[10px] text-zinc-600'>Production</div>
              </div>
            </div>

            <div className='space-y-1'>
              {[
                ['Overview', IconPulse],
                ['Applications', IconStack],
                ['Repositories', IconGitHub],
                ['Monitoring', IconPulse],
                ['Analytics', IconBolt],
                ['Team', IconUsers],
              ].map(([label, Icon], index) => {
                const Component = Icon as typeof IconPulse;

                return (
                  <div
                    key={label as string}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs ${
                      index === 0 ? 'border border-white/[0.06] bg-white/[0.055] text-white' : 'text-zinc-500'
                    }`}
                  >
                    <Component className='h-4 w-4' />
                    {label as string}
                  </div>
                );
              })}
            </div>

            <div className='mt-8 border-t border-white/[0.06] pt-5'>
              <div className='mb-3 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-700'>Infrastructure</div>

              <div className='space-y-3 px-2'>
                {['API', 'PostgreSQL', 'Redis', 'Tracker'].map((service) => (
                  <div key={service} className='flex items-center justify-between'>
                    <span className='text-[11px] text-zinc-500'>{service}</span>
                    <span className='flex items-center gap-1.5 text-[9px] text-emerald-400'>
                      <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                      Healthy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className='min-w-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.06),transparent_32%)] p-4 sm:p-6 lg:p-7'>
            <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
              <div>
                <div className='text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600'>Workspace overview</div>
                <h3 className='mt-1 text-xl font-semibold tracking-[-0.03em] text-white'>Good morning, Alex.</h3>
              </div>

              <div className='flex items-center gap-2'>
                <div className='rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-zinc-500'>Last 24 hours</div>
                <div className='rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-black'>+ New application</div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
              {[
                ['Applications', '12', '+2 this month'],
                ['Deployments', '184', '98.7% successful'],
                ['Tracked events', '2.4M', '+18.4%'],
                ['Incidents', '0', 'All healthy'],
              ].map(([label, value, hint]) => (
                <div key={label} className='rounded-xl border border-white/[0.065] bg-white/[0.023] p-4'>
                  <div className='text-[10px] text-zinc-600'>{label}</div>
                  <div className='mt-2 text-2xl font-semibold tracking-[-0.04em] text-white'>{value}</div>
                  <div className='mt-1 text-[9px] text-zinc-600'>{hint}</div>
                </div>
              ))}
            </div>

            <div className='mt-3 grid gap-3 xl:grid-cols-[1.5fr_0.9fr]'>
              <div className='rounded-xl border border-white/[0.065] bg-white/[0.02] p-4 sm:p-5'>
                <div className='flex items-start justify-between gap-5'>
                  <div>
                    <div className='text-xs font-medium text-white'>Product activity</div>
                    <div className='mt-1 text-[10px] text-zinc-600'>Events processed across your applications</div>
                  </div>

                  <StatusPill tone='blue'>Live</StatusPill>
                </div>

                <div className='mt-8 flex h-36 items-end gap-1.5 sm:gap-2'>
                  {bars.map((height, index) => (
                    <div key={`${height}-${index}`} className='group/bar relative flex h-full flex-1 items-end'>
                      <div
                        className='w-full rounded-t-[3px] bg-gradient-to-t from-blue-600/25 to-blue-400/70 transition duration-300 group-hover/bar:from-blue-500/40 group-hover/bar:to-blue-300'
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className='mt-3 flex justify-between font-mono text-[8px] text-zinc-700'>
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>

              <div className='rounded-xl border border-white/[0.065] bg-white/[0.02] p-4 sm:p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <div className='text-xs font-medium text-white'>Infrastructure</div>
                    <div className='mt-1 text-[10px] text-zinc-600'>Service health</div>
                  </div>

                  <StatusPill>Healthy</StatusPill>
                </div>

                <div className='mt-6 space-y-4'>
                  {[
                    ['API', '42 ms', 82],
                    ['PostgreSQL', '18 ms', 94],
                    ['Redis', '5 ms', 98],
                    ['Tracker', '31 ms', 87],
                  ].map(([service, latency, value]) => (
                    <div key={service as string}>
                      <div className='mb-2 flex items-center justify-between text-[10px]'>
                        <span className='text-zinc-400'>{service}</span>
                        <span className='font-mono text-zinc-600'>{latency}</span>
                      </div>
                      <div className='h-1 overflow-hidden rounded-full bg-white/[0.05]'>
                        <div className='h-full rounded-full bg-emerald-400/60' style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-3 grid gap-3 lg:grid-cols-2'>
              <div className='rounded-xl border border-white/[0.065] bg-white/[0.02] p-4 sm:p-5'>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='text-xs font-medium text-white'>Latest deployments</div>
                  <span className='text-[9px] text-zinc-600'>View all</span>
                </div>

                <div className='space-y-3'>
                  {[
                    ['command-center-web', 'main', '8f2a41', '2m'],
                    ['command-center-api', 'main', '2cc810', '7m'],
                    ['tracker-sdk', 'release', 'e9ab13', '21m'],
                  ].map(([name, branch, hash, time]) => (
                    <div key={name} className='flex items-center justify-between gap-4 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-3'>
                      <div className='min-w-0'>
                        <div className='truncate text-[11px] font-medium text-zinc-300'>{name}</div>
                        <div className='mt-1 flex items-center gap-2 font-mono text-[8px] text-zinc-600'>
                          <IconBranch className='h-3 w-3' />
                          {branch}
                          <span>{hash}</span>
                        </div>
                      </div>

                      <div className='flex items-center gap-3'>
                        <StatusPill>Success</StatusPill>
                        <span className='text-[8px] text-zinc-700'>{time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='rounded-xl border border-white/[0.065] bg-white/[0.02] p-4 sm:p-5'>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='text-xs font-medium text-white'>Recent activity</div>
                  <span className='text-[9px] text-zinc-600'>Live feed</span>
                </div>

                <div className='space-y-4'>
                  {[
                    ['Deployment completed', 'Production Â· Web', 'Just now', 'blue'],
                    ['Repository synchronized', 'GitHub Â· API', '4m ago', 'violet'],
                    ['Analytics processing finished', '2,418 events', '9m ago', 'green'],
                  ].map(([title, subtitle, time, tone]) => (
                    <div key={title} className='flex items-start gap-3'>
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          tone === 'blue' ? 'bg-blue-400' : tone === 'violet' ? 'bg-violet-400' : 'bg-emerald-400'
                        }`}
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='text-[11px] text-zinc-300'>{title}</div>
                        <div className='mt-0.5 text-[9px] text-zinc-600'>{subtitle}</div>
                      </div>
                      <span className='whitespace-nowrap text-[8px] text-zinc-700'>{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className='relative overflow-hidden px-5 pb-20 pt-36 sm:px-6 sm:pb-28 sm:pt-44 lg:px-8'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute left-1/2 top-0 h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-[160px]' />
        <div className='absolute left-[18%] top-[26%] h-64 w-64 rounded-full bg-violet-600/[0.06] blur-[120px]' />
        <div className='absolute right-[10%] top-[18%] h-56 w-56 rounded-full bg-cyan-500/[0.04] blur-[110px]' />

        <div
          className='absolute inset-x-0 top-0 h-[780px] opacity-[0.18]'
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
          }}
        />
      </div>

      <div className='relative mx-auto max-w-7xl'>
        <div className='mx-auto max-w-4xl text-center'>
          <div className='mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[0.06] px-3.5 py-1.5 text-[11px] font-medium text-blue-200'>
            <span className='relative flex h-2 w-2'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-30' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-blue-400' />
            </span>
            Built for modern SaaS engineering teams
          </div>

          <h1 className='text-balance text-[46px] font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[82px]'>
            Your SaaS operation.
            <span className='mt-2 block bg-gradient-to-r from-white via-blue-100 to-zinc-500 bg-clip-text text-transparent'>Finally in one place.</span>
          </h1>

          <p className='mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg'>
            Bring repositories, applications, deployments, analytics, infrastructure health, monitoring, and team operations into one command center built for
            developers.
          </p>

          <div className='mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row'>
            <Link
              href='/register'
              className='group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-black transition hover:bg-emerald-600 sm:w-auto'
            >
              Create your workspace
              {/* <IconArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' /> */}
            </Link>

            <Link
              href='#demo'
              className='flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-6 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.07] sm:w-auto'
            >
              Explore the platform
            </Link>
          </div>

          <div className='mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-600'>
            {['GitHub native', 'Production ready', 'Multi-workspace', 'Role-based access'].map((item) => (
              <span key={item} className='flex items-center gap-1.5'>
                <IconCheck className='h-3.5 w-3.5 text-emerald-400' />
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroDashboard />
      </div>
    </section>
  );
}

function IntegrationStrip() {
  const integrations = [
    ['GitHub', IconGitHub],
    ['Vercel', IconBolt],
    ['Render', IconStack],
    ['PostgreSQL', IconDatabase],
    ['Redis', IconPulse],
    ['Node.js', IconCode],
  ];

  return (
    <section id='integrations' className='border-y border-white/[0.055] bg-white/[0.012] px-5 py-9 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-7 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700'>
          Connect the infrastructure your product already runs on
        </div>

        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          {integrations.map(([name, Icon]) => {
            const Component = Icon as typeof IconGitHub;

            return (
              <div
                key={name as string}
                className='group flex items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-zinc-600 transition hover:border-white/[0.06] hover:bg-white/[0.02] hover:text-zinc-300'
              >
                <Component className='h-4 w-4' />
                <span className='text-xs font-medium'>{name as string}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  eyebrow,
  title,
  description,
  icon,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#090b10] p-6 transition duration-500 hover:border-white/[0.13] sm:p-7 ${className}`}
    >
      <div className='pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/[0.04] blur-[70px] transition group-hover:bg-blue-500/[0.08]' />

      <div className='relative z-10'>
        <div className='mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-zinc-300'>{icon}</div>

        <div className='text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600'>{eyebrow}</div>

        <h3 className='mt-2 text-xl font-semibold tracking-[-0.025em] text-white'>{title}</h3>

        <p className='mt-3 max-w-md text-sm leading-6 text-zinc-500'>{description}</p>
      </div>

      {children}
    </article>
  );
}

function Features() {
  return (
    <section id='features' className='px-5 py-24 sm:px-6 sm:py-32 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end'>
          <div>
            <SectionEyebrow>Everything connected</SectionEyebrow>
            <h2 className='max-w-xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl'>Stop operating your SaaS from ten different tabs.</h2>
          </div>

          <div className='max-w-xl lg:justify-self-end'>
            <p className='text-base leading-7 text-zinc-500'>
              SaaS Command Center turns scattered operational data into one structured workspaceâ€”giving your team a single place to understand what is
              running, what changed, and what needs attention.
            </p>
          </div>
        </div>

        <div className='mt-14 grid gap-4 lg:grid-cols-12'>
          <FeatureCard
            eyebrow='Workspace'
            title='Your entire product landscape'
            description='Organize multiple products, applications, repositories, websites, environments, and team members under a single workspace.'
            icon={<IconStack className='h-5 w-5' />}
            className='min-h-[470px] lg:col-span-7'
          >
            <div className='absolute inset-x-5 bottom-0 h-[235px] translate-y-4 overflow-hidden rounded-t-2xl border border-white/[0.07] bg-[#06080c] transition duration-500 group-hover:translate-y-1 sm:inset-x-8'>
              <div className='flex h-11 items-center justify-between border-b border-white/[0.06] px-4'>
                <div className='text-[10px] font-medium text-zinc-500'>Applications</div>
                <span className='rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[8px] text-zinc-600'>12 total</span>
              </div>

              <div className='space-y-2 p-3'>
                {[
                  ['Customer Portal', 'Production', 'Next.js'],
                  ['Command API', 'Production', 'NestJS'],
                  ['Analytics Worker', 'Running', 'Node.js'],
                ].map(([name, status, tech]) => (
                  <div key={name} className='flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/[0.08] text-blue-300'>
                      <IconCode className='h-4 w-4' />
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-[10px] font-medium text-zinc-300'>{name}</div>
                      <div className='mt-0.5 text-[8px] text-zinc-700'>{tech}</div>
                    </div>

                    <span className='text-[8px] text-emerald-400'>{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            eyebrow='GitHub'
            title='Repository intelligence'
            description='Connect GitHub, import repositories, inspect code, detect technology, and understand application structure automatically.'
            icon={<IconGitHub className='h-5 w-5' />}
            className='min-h-[470px] lg:col-span-5'
          >
            <div className='absolute inset-x-6 bottom-6 rounded-2xl border border-white/[0.07] bg-black/40 p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <IconGitHub className='h-4 w-4 text-zinc-400' />
                  <span className='text-[11px] font-medium text-zinc-300'>acme/command-center</span>
                </div>
                <StatusPill>Synced</StatusPill>
              </div>

              <div className='mt-5 space-y-2 font-mono text-[9px]'>
                {[
                  ['apps/', '3 applications detected'],
                  ['packages/', '5 workspace packages'],
                  ['package.json', 'pnpm workspace'],
                  ['render.yaml', 'deployment config'],
                ].map(([file, hint]) => (
                  <div key={file} className='flex items-center justify-between border-b border-white/[0.045] pb-2 text-zinc-600 last:border-0'>
                    <span className='text-zinc-400'>{file}</span>
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            eyebrow='Observability'
            title='Know when your systems change'
            description='Track infrastructure health, application monitoring, events, analytics processing, and deployment activity.'
            icon={<IconPulse className='h-5 w-5' />}
            className='min-h-[370px] lg:col-span-4'
          >
            <div className='absolute inset-x-6 bottom-6'>
              <div className='flex h-24 items-end gap-2'>
                {[39, 57, 44, 72, 61, 88, 69, 94].map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className='flex-1 rounded-t-sm bg-gradient-to-t from-blue-600/15 to-blue-400/55'
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className='mt-3 flex items-center justify-between text-[9px] text-zinc-700'>
                <span>Analytics throughput</span>
                <span className='text-emerald-400'>+18.4%</span>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            eyebrow='Team operations'
            title='Access without chaos'
            description='Manage workspace memberships, invitations, roles, notifications, and authorization boundaries from the same control plane.'
            icon={<IconUsers className='h-5 w-5' />}
            className='min-h-[370px] lg:col-span-4'
          >
            <div className='absolute inset-x-6 bottom-6 space-y-2'>
              {[
                ['AK', 'Alex Kim', 'Owner'],
                ['MH', 'Mia Hassan', 'Admin'],
                ['JT', 'James Taylor', 'Developer'],
              ].map(([initials, name, role]) => (
                <div key={name} className='flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-2.5'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-semibold text-zinc-300'>{initials}</div>
                  <span className='flex-1 text-[10px] text-zinc-400'>{name}</span>
                  <span className='text-[8px] text-zinc-600'>{role}</span>
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard
            eyebrow='Release management'
            title='Deployments in context'
            description='Follow environments, release states, commits, branches, and application changes without losing the bigger picture.'
            icon={<IconBolt className='h-5 w-5' />}
            className='min-h-[370px] lg:col-span-4'
          >
            <div className='absolute inset-x-6 bottom-6 rounded-2xl border border-white/[0.07] bg-black/35 p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-medium text-white'>Production</span>
                <StatusPill>Active</StatusPill>
              </div>

              <div className='my-4 h-px bg-white/[0.06]' />

              <div className='grid grid-cols-2 gap-4 text-[9px]'>
                <div>
                  <div className='text-zinc-700'>Branch</div>
                  <div className='mt-1 font-mono text-zinc-400'>main</div>
                </div>
                <div>
                  <div className='text-zinc-700'>Commit</div>
                  <div className='mt-1 font-mono text-zinc-400'>8f2a41d</div>
                </div>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    {
      number: '01',
      title: 'Create your workspace',
      description: 'Create the operational home for your SaaS product and establish its access boundary.',
      icon: <IconStack className='h-5 w-5' />,
    },
    {
      number: '02',
      title: 'Connect GitHub',
      description: 'Connect repositories and let Command Center inspect the technology and structure already in your codebase.',
      icon: <IconGitHub className='h-5 w-5' />,
    },
    {
      number: '03',
      title: 'Bring applications online',
      description: 'Organize applications, websites, environments, deployments, and monitoring under the workspace.',
      icon: <IconBolt className='h-5 w-5' />,
    },
    {
      number: '04',
      title: 'Operate from one place',
      description: 'Use one shared view for analytics, infrastructure health, code, releases, activity, and team access.',
      icon: <IconPulse className='h-5 w-5' />,
    },
  ];

  return (
    <section id='workflow' className='border-y border-white/[0.055] bg-white/[0.012] px-5 py-24 sm:px-6 sm:py-32 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='mx-auto max-w-2xl text-center'>
          <SectionEyebrow center>Simple workflow</SectionEyebrow>
          <h2 className='text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl'>From repository to operations in minutes.</h2>
          <p className='mt-5 text-base leading-7 text-zinc-500'>
            Command Center is designed around the way software teams already workâ€”not around another complicated setup process.
          </p>
        </div>

        <div className='relative mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <div className='absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent xl:block' />

          {steps.map((step) => (
            <article key={step.number} className='relative rounded-[20px] border border-white/[0.065] bg-[#090b10] p-6'>
              <div className='relative z-10 mb-10 flex items-center justify-between'>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-400/[0.06] text-blue-300'>
                  {step.icon}
                </div>
                <span className='font-mono text-[10px] text-zinc-700'>{step.number}</span>
              </div>

              <h3 className='text-base font-semibold text-white'>{step.title}</h3>

              <p className='mt-3 text-sm leading-6 text-zinc-500'>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeveloperExperience() {
  return (
    <section className='px-5 py-24 sm:px-6 sm:py-32 lg:px-8'>
      <div className='mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2'>
        <div>
          <SectionEyebrow>Developer first</SectionEyebrow>

          <h2 className='max-w-xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl'>Built for teams that ship software.</h2>

          <p className='mt-6 max-w-xl text-base leading-7 text-zinc-500'>
            Every workflow is centered around repositories, environments, application state, deployments, observability, and secure team collaboration.
          </p>

          <div className='mt-9 grid gap-3 sm:grid-cols-2'>
            {[
              'GitHub repository integration',
              'Repository code explorer',
              'Application detection',
              'Production health checks',
              'Analytics processing',
              'Workspace isolation',
              'Role-based authorization',
              'Deployment visibility',
            ].map((feature) => (
              <div key={feature} className='flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-4 py-3'>
                <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400'>
                  <IconCheck className='h-3 w-3' />
                </div>
                <span className='text-xs text-zinc-400'>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='relative'>
          <div className='absolute inset-10 -z-10 rounded-full bg-blue-500/10 blur-[90px]' />

          <div className='overflow-hidden rounded-[22px] border border-white/[0.085] bg-[#07090d] shadow-[0_40px_120px_rgba(0,0,0,0.55)]'>
            <div className='flex h-12 items-center justify-between border-b border-white/[0.065] px-4'>
              <div className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-white/10' />
                <span className='h-2.5 w-2.5 rounded-full bg-white/10' />
                <span className='h-2.5 w-2.5 rounded-full bg-white/10' />
              </div>

              <div className='flex items-center gap-2 text-[9px] text-zinc-600'>
                <IconTerminal className='h-3.5 w-3.5' />
                command-center
              </div>

              <div className='w-10' />
            </div>

            <div className='min-h-[370px] p-5 font-mono text-[11px] leading-7 sm:p-7'>
              <div className='text-zinc-600'>
                <span className='text-blue-400'>â¯</span> command-center connect github
              </div>

              <div className='mt-5 text-zinc-500'>Checking installation permissions...</div>

              <div className='mt-2 text-emerald-400'>âœ“ GitHub installation verified</div>

              <div className='text-emerald-400'>âœ“ Repository access granted</div>
              <div className='text-emerald-400'>âœ“ 3 applications detected</div>
              <div className='text-emerald-400'>âœ“ Workspace configuration generated</div>

              <div className='mt-6 text-zinc-600'>
                <span className='text-blue-400'>â¯</span> command-center status
              </div>

              <div className='mt-4 grid grid-cols-[120px_1fr] gap-y-1 text-zinc-500'>
                <span>API</span>
                <span className='text-emerald-400'>healthy Â· 42ms</span>

                <span>PostgreSQL</span>
                <span className='text-emerald-400'>healthy Â· 18ms</span>

                <span>Redis</span>
                <span className='text-emerald-400'>healthy Â· 5ms</span>

                <span>Deployment</span>
                <span className='text-blue-300'>production Â· active</span>
              </div>

              <div className='mt-7 flex items-center gap-2 text-zinc-300'>
                Ready.
                <span className='inline-block h-4 w-1.5 animate-pulse bg-blue-400' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className='border-y border-white/[0.055] bg-white/[0.012] px-5 py-24 sm:px-6 sm:py-32 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='mx-auto max-w-2xl text-center'>
          <SectionEyebrow center>Architecture</SectionEyebrow>

          <h2 className='text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl'>One control plane. Your entire stack.</h2>

          <p className='mt-5 text-base leading-7 text-zinc-500'>
            Connect the systems your team already uses without forcing your product into a new deployment model.
          </p>
        </div>

        <div className='mx-auto mt-16 max-w-5xl rounded-[24px] border border-white/[0.07] bg-[#080a0f] p-5 sm:p-8'>
          <div className='mx-auto max-w-3xl'>
            <div className='mx-auto flex max-w-sm items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] px-5 py-4 text-sm font-semibold text-white shadow-[0_0_60px_rgba(59,130,246,0.08)]'>
              <LogoMark />
              SaaS Command Center
            </div>

            <div className='mx-auto h-12 w-px bg-gradient-to-b from-blue-400/40 to-white/10' />

            <div className='grid gap-3 md:grid-cols-3'>
              {[
                ['Repositories', IconGitHub, 'Code & integrations'],
                ['Operations', IconPulse, 'Health & analytics'],
                ['Team', IconUsers, 'Access & collaboration'],
              ].map(([title, Icon, description]) => {
                const Component = Icon as typeof IconGitHub;

                return (
                  <div key={title as string} className='rounded-2xl border border-white/[0.065] bg-white/[0.02] p-5 text-center'>
                    <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-zinc-400'>
                      <Component className='h-5 w-5' />
                    </div>
                    <div className='mt-4 text-xs font-medium text-white'>{title as string}</div>
                    <div className='mt-1 text-[9px] text-zinc-600'>{description as string}</div>
                  </div>
                );
              })}
            </div>

            <div className='mx-auto h-12 w-px bg-white/10' />

            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              {[
                ['API', IconCode],
                ['PostgreSQL', IconDatabase],
                ['Redis', IconPulse],
                ['Cloud', IconStack],
              ].map(([title, Icon]) => {
                const Component = Icon as typeof IconCode;

                return (
                  <div
                    key={title as string}
                    className='flex items-center justify-center gap-2 rounded-xl border border-white/[0.055] bg-black/30 px-4 py-3 text-[10px] text-zinc-500'
                  >
                    <Component className='h-3.5 w-3.5' />
                    {title as string}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section id='security' className='px-5 py-24 sm:px-6 sm:py-32 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='overflow-hidden rounded-[28px] border border-white/[0.075] bg-[#090b10]'>
          <div className='grid lg:grid-cols-[0.95fr_1.05fr]'>
            <div className='relative border-b border-white/[0.06] p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-14'>
              <div className='pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-600/[0.07] blur-[100px]' />

              <div className='relative'>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/15 bg-blue-400/[0.06] text-blue-300'>
                  <IconShield className='h-6 w-6' />
                </div>

                <SectionEyebrow>Security by design</SectionEyebrow>

                <h2 className='max-w-lg text-4xl font-semibold tracking-[-0.045em] text-white'>Built for production boundaries, not demo shortcuts.</h2>

                <p className='mt-5 max-w-lg text-sm leading-7 text-zinc-500'>
                  Authentication, workspace isolation, role checks, secure cookies, refresh-token rotation, webhook verification, rate limiting, and production
                  configuration validation are first-class parts of the platform.
                </p>
              </div>
            </div>

            <div className='grid gap-px bg-white/5.5 sm:grid-cols-2'>
              {[
                ['Workspace isolation', 'Requests stay inside authorized tenant boundaries.'],
                ['Secure authentication', 'Short-lived access tokens with refresh rotation.'],
                ['Role-based access', 'Owner, admin, developer, and viewer permissions.'],
                ['Webhook verification', 'HMAC verification and delivery deduplication.'],
                ['Production validation', 'Critical configuration fails fast at startup.'],
                ['Protected integrations', 'GitHub installation and repository access checks.'],
              ].map(([title, description]) => (
                <div key={title} className='bg-[#090b10] p-7 sm:p-8'>
                  <div className='mb-4 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400'>
                    <IconCheck className='h-4 w-4' />
                  </div>
                  <h3 className='text-sm font-medium text-white'>{title}</h3>
                  <p className='mt-2 text-xs leading-5 text-zinc-600'>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const questions = [
    [
      'What does SaaS Command Center replace?',
      'It does not replace GitHub, your database, deployment provider, or infrastructure. It gives you one operational layer that connects those systems and exposes the information your team needs in one workspace.',
    ],
    [
      'Can I manage multiple SaaS products?',
      'Yes. Workspaces are designed to organize multiple applications, repositories, websites, environments, integrations, and team members.',
    ],
    [
      'Does it connect directly to GitHub?',
      'Yes. The platform includes GitHub App based repository connectivity, installation authorization, repository importing, code exploration, and repository analysis workflows.',
    ],
    [
      'Is it designed for production environments?',
      'Yes. The architecture includes production configuration validation, secure authentication, role-based access, workspace isolation, health checks, Redis-backed services, database migrations, and webhook verification.',
    ],
  ];

  return (
    <section className='px-5 py-24 sm:px-6 sm:py-32 lg:px-8'>
      <div className='mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.7fr_1.3fr]'>
        <div>
          <SectionEyebrow>FAQ</SectionEyebrow>

          <h2 className='text-4xl font-semibold tracking-[-0.04em] text-white'>A few things teams ask first.</h2>

          <p className='mt-5 max-w-sm text-sm leading-6 text-zinc-500'>
            SaaS Command Center is designed as an operational layer around your existing engineering stack.
          </p>
        </div>

        <div className='divide-y divide-white/[0.06] border-y border-white/[0.06]'>
          {questions.map(([question, answer]) => (
            <details key={question} className='group'>
              <summary className='flex cursor-pointer list-none items-center justify-between gap-5 py-6'>
                <span className='text-sm font-medium text-zinc-200'>{question}</span>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-zinc-500'>
                  <IconChevronDown className='h-4 w-4 transition-transform group-open:rotate-180' />
                </div>
              </summary>

              <p className='max-w-2xl pb-6 pr-12 text-sm leading-7 text-zinc-500'>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className='px-5 pb-24 sm:px-6 sm:pb-32 lg:px-8'>
      <div className='relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#0a0c12] px-6 py-20 text-center sm:px-10 sm:py-24'>
        <div className='pointer-events-none absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/[0.14] blur-[120px]' />
        <div className='pointer-events-none absolute bottom-[-200px] left-[20%] h-[300px] w-[300px] rounded-full bg-violet-600/[0.09] blur-[110px]' />

        <div
          className='pointer-events-none absolute inset-0 opacity-[0.12]'
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(circle at center, black, transparent 75%)',
          }}
        />

        <div className='relative mx-auto max-w-3xl'>
          <div className='mx-auto mb-7 flex h-12 w-12 items-center justify-center'>
            <LogoMark />
          </div>

          <h2 className='text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl md:text-6xl'>Stop switching between dashboards.</h2>

          <p className='mx-auto mt-6 max-w-xl text-base leading-7 text-zinc-500'>
            Create one workspace for the code, services, deployments, analytics, and people behind your SaaS.
          </p>

          <div className='mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row'>
            <Link
              href='/register'
              className='group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-black transition hover:bg-emerald-600 sm:w-auto'
            >
              Create your workspace
              <IconArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
            </Link>

            <Link
              href='/login'
              className='flex h-12 w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-6 text-sm font-medium text-white transition hover:bg-white/[0.05] sm:w-auto'
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className='border-t border-white/[0.055] px-5 pb-8 pt-14 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]'>
          <div>
            <Link href='/' className='inline-flex items-center gap-3'>
              <LogoMark />
              <span className='text-sm font-semibold text-white'>SaaS Command Center</span>
            </Link>

            <p className='mt-5 max-w-sm text-sm leading-6 text-zinc-600'>A centralized operations workspace for modern SaaS engineering teams.</p>
          </div>

          <div>
            <div className='mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700'>Product</div>
            <div className='space-y-3'>
              {(
                [
                  ['Features', '#features'],
                  ['Workflow', '#workflow'],
                  ['Integrations', '#integrations'],
                  ['Security', '#security'],
                ] as const
              ).map(([label, href]) => (
                <Link key={label} href={href} className='block text-xs text-zinc-600 transition hover:text-white'>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className='mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700'>Platform</div>
            <div className='space-y-3'>
              <Link href='/login' className='block text-xs text-zinc-600 transition hover:text-white'>
                Sign in
              </Link>
              <Link href='/register' className='block text-xs text-zinc-600 transition hover:text-white'>
                Create workspace
              </Link>
              <Link href='#' className='block text-xs text-zinc-600 transition hover:text-white'>
                Documentation
              </Link>
            </div>
          </div>

          <div>
            <div className='mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700'>Legal</div>
            <div className='space-y-3'>
              <Link href='#' className='block text-xs text-zinc-600 transition hover:text-white'>
                Privacy
              </Link>
              <Link href='#' className='block text-xs text-zinc-600 transition hover:text-white'>
                Terms
              </Link>
              <Link href='#' className='block text-xs text-zinc-600 transition hover:text-white'>
                Security
              </Link>
            </div>
          </div>
        </div>

        <div className='mt-14 flex flex-col gap-4 border-t border-white/[0.055] pt-7 text-[10px] text-zinc-700 sm:flex-row sm:items-center sm:justify-between'>
          <p>Â© 2026 SaaS Command Center. All rights reserved.</p>

          <div className='flex items-center gap-2'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className='min-h-screen overflow-x-hidden bg-[#05070b] text-white selection:bg-blue-500/30 selection:text-white'>
      <Navbar />

      <main>
        <Hero />
        <IntegrationStrip />
        <Features />
        <Workflow />
        <DeveloperExperience />
        <Architecture />
        <Security />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
