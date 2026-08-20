import { AnalyticsDeviceType, AnalyticsSourceType } from 'src/generated/prisma/enums';

const TRACKING_PARAMETER = /^(utm_.+|gclid|dclid|fbclid|msclkid|yclid|mc_cid|mc_eid)$/i;

const SEARCH_ENGINES: Array<{
  pattern: RegExp;
  name: string;
}> = [
  {
    pattern: /(^|\.)google\./i,
    name: 'Google',
  },
  {
    pattern: /(^|\.)bing\.com$/i,
    name: 'Bing',
  },
  {
    pattern: /(^|\.)yahoo\./i,
    name: 'Yahoo',
  },
  {
    pattern: /(^|\.)duckduckgo\.com$/i,
    name: 'DuckDuckGo',
  },
  {
    pattern: /(^|\.)baidu\.com$/i,
    name: 'Baidu',
  },
  {
    pattern: /(^|\.)yandex\./i,
    name: 'Yandex',
  },
];

const SOCIAL_NETWORKS: Array<{
  pattern: RegExp;
  name: string;
}> = [
  {
    pattern: /(^|\.)facebook\.com$/i,
    name: 'Facebook',
  },
  {
    pattern: /(^|\.)instagram\.com$/i,
    name: 'Instagram',
  },
  {
    pattern: /(^|\.)linkedin\.com$/i,
    name: 'LinkedIn',
  },
  {
    pattern: /(^|\.)twitter\.com$|(^|\.)x\.com$/i,
    name: 'X',
  },
  {
    pattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i,
    name: 'YouTube',
  },
  {
    pattern: /(^|\.)tiktok\.com$/i,
    name: 'TikTok',
  },
  {
    pattern: /(^|\.)reddit\.com$/i,
    name: 'Reddit',
  },
];

export interface NormalizedPage {
  pageUrl: string;
  normalizedPath: string;
  origin: string;
  hostname: string;
}

export interface NormalizedSource {
  sourceType: AnalyticsSourceType;

  sourceName: string;

  sourceDomain: string | null;
}

export interface ParsedUserAgent {
  deviceType: AnalyticsDeviceType;

  browserName: string;

  browserVersion: string | null;

  operatingSystem: string;

  operatingSystemVersion: string | null;
}

export function normalizeAnalyticsPage(value: string): NormalizedPage {
  const url = new URL(value);

  url.username = '';
  url.password = '';
  url.hash = '';

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER.test(key)) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();

  let pathname = url.pathname.replace(/\/{2,}/g, '/');

  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, '');
  }

  if (!pathname) {
    pathname = '/';
  }

  url.pathname = pathname;

  const search = url.searchParams.toString();

  const normalizedPath = `${pathname}${search ? `?${search}` : ''}`;

  return {
    pageUrl: url.toString().slice(0, 2048),

    normalizedPath: normalizedPath.slice(0, 2048),

    origin: url.origin.toLowerCase(),

    hostname: url.hostname.toLowerCase(),
  };
}

export function normalizeSource(
  referrerUrl: string | null,

  pageOrigin: string,
): NormalizedSource {
  if (!referrerUrl) {
    return {
      sourceType: AnalyticsSourceType.DIRECT,

      sourceName: 'Direct',

      sourceDomain: null,
    };
  }

  let referrer: URL;

  try {
    referrer = new URL(referrerUrl);
  } catch {
    return {
      sourceType: AnalyticsSourceType.UNKNOWN,

      sourceName: 'Unknown',

      sourceDomain: null,
    };
  }

  const domain = referrer.hostname.toLowerCase();

  if (referrer.origin.toLowerCase() === pageOrigin) {
    return {
      sourceType: AnalyticsSourceType.INTERNAL,

      sourceName: 'Internal',

      sourceDomain: domain,
    };
  }

  const searchEngine = SEARCH_ENGINES.find((item) => item.pattern.test(domain));

  if (searchEngine) {
    return {
      sourceType: AnalyticsSourceType.SEARCH,

      sourceName: searchEngine.name,

      sourceDomain: domain,
    };
  }

  const socialNetwork = SOCIAL_NETWORKS.find((item) => item.pattern.test(domain));

  if (socialNetwork) {
    return {
      sourceType: AnalyticsSourceType.SOCIAL,

      sourceName: socialNetwork.name,

      sourceDomain: domain,
    };
  }

  return {
    sourceType: AnalyticsSourceType.REFERRAL,

    sourceName: domain,

    sourceDomain: domain,
  };
}

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  const value = userAgent ?? '';

  if (/bot|crawler|spider|slurp|headless|facebookexternalhit|preview/i.test(value)) {
    return {
      deviceType: AnalyticsDeviceType.BOT,

      browserName: 'Bot',

      browserVersion: null,

      operatingSystem: 'Unknown',

      operatingSystemVersion: null,
    };
  }

  const deviceType = /ipad|tablet|kindle|silk/i.test(value)
    ? AnalyticsDeviceType.TABLET
    : /mobile|iphone|ipod|android.+mobile/i.test(value)
      ? AnalyticsDeviceType.MOBILE
      : AnalyticsDeviceType.DESKTOP;

  const browser = parseBrowser(value);

  const operatingSystem = parseOperatingSystem(value);

  return {
    deviceType,

    browserName: browser.name,

    browserVersion: browser.version,

    operatingSystem: operatingSystem.name,

    operatingSystemVersion: operatingSystem.version,
  };
}

function parseBrowser(userAgent: string): {
  name: string;
  version: string | null;
} {
  const patterns: Array<{
    pattern: RegExp;
    name: string;
  }> = [
    {
      pattern: /EdgA?\/([\d.]+)/,
      name: 'Edge',
    },
    {
      pattern: /OPR\/([\d.]+)/,
      name: 'Opera',
    },
    {
      pattern: /Firefox\/([\d.]+)/,
      name: 'Firefox',
    },
    {
      pattern: /CriOS\/([\d.]+)/,
      name: 'Chrome',
    },
    {
      pattern: /Chrome\/([\d.]+)/,
      name: 'Chrome',
    },
    {
      pattern: /Version\/([\d.]+).*Safari/,
      name: 'Safari',
    },
  ];

  for (const item of patterns) {
    const match = item.pattern.exec(userAgent);

    if (match?.[1]) {
      return {
        name: item.name,
        version: match[1].slice(0, 50),
      };
    }
  }

  return {
    name: 'Unknown',
    version: null,
  };
}

function parseOperatingSystem(userAgent: string): {
  name: string;
  version: string | null;
} {
  const windows = /Windows NT ([\d.]+)/.exec(userAgent);

  if (windows?.[1]) {
    return {
      name: 'Windows',
      version: windows[1],
    };
  }

  const android = /Android ([\d.]+)/.exec(userAgent);

  if (android?.[1]) {
    return {
      name: 'Android',
      version: android[1],
    };
  }

  const ios = /(?:iPhone|CPU) OS ([\d_]+)/.exec(userAgent);

  if (ios?.[1]) {
    return {
      name: 'iOS',
      version: ios[1].replace(/_/g, '.'),
    };
  }

  const mac = /Mac OS X ([\d_]+)/.exec(userAgent);

  if (mac?.[1]) {
    return {
      name: 'macOS',
      version: mac[1].replace(/_/g, '.'),
    };
  }

  if (/CrOS/i.test(userAgent)) {
    return {
      name: 'Chrome OS',
      version: null,
    };
  }

  if (/Linux/i.test(userAgent)) {
    return {
      name: 'Linux',
      version: null,
    };
  }

  return {
    name: 'Unknown',
    version: null,
  };
}
