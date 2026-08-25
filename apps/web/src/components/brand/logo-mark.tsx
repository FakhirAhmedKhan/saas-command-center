interface LogoMarkProps {
  className?: string;
}

/**
 * Hub-and-node mark: one command center orchestrating several connected
 * SaaS products (applications, repos, monitoring, alerts). Kept as plain
 * geometry (circles + lines) rather than illustrative shapes so it still
 * reads clearly at 16-28px (sidebar badge, favicon), not only at poster size.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox='0 0 1024 1024' fill='none' xmlns='http://www.w3.org/2000/svg' className={className} role='img' aria-label='SaaS Command Center'>
      <defs>
        <linearGradient id='logoMarkBgGrad' x1='140' y1='120' x2='900' y2='920' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#06173A' />
          <stop offset='0.6' stopColor='#031238' />
          <stop offset='1' stopColor='#24105F' />
        </linearGradient>

        <linearGradient id='logoMarkRingGrad' x1='120' y1='140' x2='880' y2='900' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#67A8FF' />
          <stop offset='0.55' stopColor='#0A6BFF' />
          <stop offset='1' stopColor='#8B4DFF' />
        </linearGradient>

        <linearGradient id='logoMarkCore' x1='420' y1='380' x2='604' y2='560' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#FFFFFF' />
          <stop offset='1' stopColor='#9FCBFF' />
        </linearGradient>

        <linearGradient id='logoMarkNode' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#8FC1FF' />
          <stop offset='1' stopColor='#B48CFF' />
        </linearGradient>

        <filter id='logoMarkOuterGlow' x='0' y='0' width='1024' height='1024' filterUnits='userSpaceOnUse' colorInterpolationFilters='sRGB'>
          <feGaussianBlur stdDeviation='24' result='blur' />
          <feColorMatrix in='blur' type='matrix' values='1 0 0 0 0  0 0.6 0 0 0  0 0 1 0 0  0 0 0 0.65 0' />
          <feBlend in='SourceGraphic' mode='screen' />
        </filter>

        <filter id='logoMarkCoreGlow' x='300' y='260' width='424' height='424' filterUnits='userSpaceOnUse' colorInterpolationFilters='sRGB'>
          <feGaussianBlur stdDeviation='18' result='b' />
          <feColorMatrix in='b' type='matrix' values='1 0 0 0 0  0 0.6 0 0 0  0 0 1 0 0  0 0 0 0.55 0' />
          <feBlend in='SourceGraphic' mode='screen' />
        </filter>
      </defs>

      <rect width='1024' height='1024' rx='170' fill='#010714' />

      <g filter='url(#logoMarkOuterGlow)'>
        <rect x='60' y='60' width='904' height='904' rx='165' fill='url(#logoMarkBgGrad)' />
        <rect x='60' y='60' width='904' height='904' rx='165' stroke='url(#logoMarkRingGrad)' strokeWidth='8' />
      </g>

      {/* Spokes: connect the command center to each managed product. */}
      <g stroke='url(#logoMarkRingGrad)' strokeWidth='14' strokeLinecap='round' opacity='0.85'>
        <line x1='512' y1='512' x2='512' y2='268' />
        <line x1='512' y1='512' x2='728' y2='400' />
        <line x1='512' y1='512' x2='716' y2='650' />
        <line x1='512' y1='512' x2='352' y2='690' />
        <line x1='512' y1='512' x2='300' y2='420' />
      </g>

      {/* Satellite nodes: individually managed SaaS products/services. */}
      <g fill='url(#logoMarkNode)'>
        <circle cx='512' cy='268' r='54' />
        <circle cx='728' cy='400' r='40' />
        <circle cx='716' cy='650' r='46' />
        <circle cx='352' cy='690' r='40' />
        <circle cx='300' cy='420' r='34' />
      </g>

      {/* Command center core. */}
      <g filter='url(#logoMarkCoreGlow)'>
        <circle cx='512' cy='512' r='92' fill='url(#logoMarkCore)' />
      </g>
      <circle cx='512' cy='512' r='92' fill='none' stroke='#06173A' strokeWidth='10' opacity='0.35' />
    </svg>
  );
}
