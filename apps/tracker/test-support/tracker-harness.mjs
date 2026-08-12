import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Coverage runs point this at an unminified build so the v8 report maps back
// to readable source instead of a single minified line.
const bundleUrl = process.env.TRACKER_BUNDLE
  ? new URL(process.env.TRACKER_BUNDLE, import.meta.url)
  : new URL('../dist/tracker.js', import.meta.url);
let cachedBundle;

async function readBundle() {
  cachedBundle ??= await readFile(bundleUrl, 'utf8');
  return cachedBundle;
}

class MemoryStorage {
  #values = new Map();
  #throwOnAccess = false;

  constructor(initial = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.#values.set(key, String(value));
    }
  }

  setThrowOnAccess(value) {
    this.#throwOnAccess = value;
  }

  getItem(key) {
    if (this.#throwOnAccess) throw new Error('Storage unavailable');
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    if (this.#throwOnAccess) throw new Error('Storage unavailable');
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    if (this.#throwOnAccess) throw new Error('Storage unavailable');
    this.#values.delete(key);
  }

  clear() {
    if (this.#throwOnAccess) throw new Error('Storage unavailable');
    this.#values.clear();
  }

  key(index) {
    if (this.#throwOnAccess) throw new Error('Storage unavailable');
    return [...this.#values.keys()][index] ?? null;
  }

  get length() {
    if (this.#throwOnAccess) throw new Error('Storage unavailable');
    return this.#values.size;
  }

  snapshot() {
    return Object.fromEntries(this.#values.entries());
  }
}

function makeEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    },

    removeEventListener(type, listener) {
      const current = listeners.get(type) ?? [];
      listeners.set(
        type,
        current.filter((entry) => entry !== listener),
      );
    },

    dispatchEvent(event) {
      const normalized = typeof event === 'string' ? { type: event } : event;

      for (const listener of listeners.get(normalized.type) ?? []) {
        listener.call(this, normalized);
      }

      return true;
    },

    listenerCount(type) {
      return (listeners.get(type) ?? []).length;
    },
  };
}

function makeLocation(initialHref) {
  let current = new URL(initialHref);

  return {
    get href() {
      return current.toString();
    },

    set href(value) {
      current = new URL(value, current);
    },

    get origin() {
      return current.origin;
    },

    get pathname() {
      return current.pathname;
    },

    get search() {
      return current.search;
    },

    get hash() {
      return current.hash;
    },

    toString() {
      return current.toString();
    },
  };
}

export async function createTrackerHarness(options = {}) {
  const {
    websiteId = '11111111-1111-4111-8111-111111111111',
    trackingKey = 'cc_live_test_key',
    endpoint = 'https://analytics.example.com/api/v1/collect',
    href = 'https://app.example.com/dashboard',
    title = 'Dashboard',
    referrer = '',
    timeZone = 'UTC',
    doNotTrack = '0',
    online = true,
    visibilityState = 'visible',
    dataset = {},
    currentScript = true,
    localStorage: initialStorage = {},
    now = Date.parse('2026-08-07T00:00:00.000Z'),
    fetchReject = false,
    sendBeaconResult = true,
  } = options;

  const bundle = await readBundle();
  const requests = [];
  const beacons = [];
  const intervals = new Map();
  let timerSequence = 0;
  let currentNow = now;
  let shouldRejectFetch = fetchReject;
  let beaconResult = sendBeaconResult;
  let pendingFetchResolver = null;
  let blockFetch = false;
  let identifierSequence = 0;

  const storage = new MemoryStorage(initialStorage);
  const windowEvents = makeEventTarget();
  const documentEvents = makeEventTarget();
  const location = makeLocation(href);

  class FakeDate extends Date {
    constructor(...args) {
      super(...(args.length > 0 ? args : [currentNow]));
    }

    static now() {
      return currentNow;
    }
  }

  const document = {
    ...documentEvents,
    title,
    referrer,
    visibilityState,
    currentScript: currentScript
      ? {
          dataset: {
            websiteId,
            trackingKey,
            endpoint,
            ...dataset,
          },
        }
      : null,
  };

  const navigator = {
    doNotTrack,
    onLine: online,
    language: 'en-US',
    sendBeacon(url, body) {
      beacons.push({ url, body });
      return beaconResult;
    },
  };

  const history = {
    pushState(_state, _unused, url) {
      if (url !== undefined && url !== null) {
        location.href = String(url);
      }
    },

    replaceState(_state, _unused, url) {
      if (url !== undefined && url !== null) {
        location.href = String(url);
      }
    },
  };

  const window = {
    ...windowEvents,
    document,
    navigator,
    history,
    location,
    localStorage: storage,
    innerWidth: 1440,
    innerHeight: 900,
    screen: {
      width: 1920,
      height: 1080,
    },

    setInterval(callback, delay) {
      const id = ++timerSequence;
      intervals.set(id, { callback, delay });
      return id;
    },

    clearInterval(id) {
      intervals.delete(id);
    },

    setTimeout(callback) {
      callback();
      return ++timerSequence;
    },

    clearTimeout() {},
  };

  async function fetchImpl(url, init = {}) {
    requests.push({ url: String(url), init });

    if (blockFetch) {
      await new Promise((resolve) => {
        pendingFetchResolver = resolve;
      });
    }

    if (shouldRejectFetch) {
      throw new Error('Network unavailable');
    }

    return {
      ok: true,
      status: 202,
      type: 'opaque',
    };
  }

  const testIntl = {
    DateTimeFormat(...args) {
      const formatter = new Intl.DateTimeFormat(...args);

      return {
        resolvedOptions() {
          return {
            ...formatter.resolvedOptions(),
            timeZone,
          };
        },
      };
    },
  };
  const context = vm.createContext({
    window,
    document,
    navigator,
    history,
    localStorage: storage,
    location,
    fetch: fetchImpl,
    Blob,
    URL,
    Intl: testIntl,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    Uint8Array,
    Date: FakeDate,
    crypto: {
      randomUUID() {
        identifierSequence += 1;
        return `00000000-0000-4000-8000-${String(identifierSequence).padStart(12, '0')}`;
      },

      getRandomValues(array) {
        for (let index = 0; index < array.length; index += 1) {
          array[index] = (identifierSequence + index + 1) % 256;
        }
        identifierSequence += 1;
        return array;
      },
    },
    console,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
  });

  window.window = window;
  window.self = window;
  window.globalThis = window;

  function executeBundle() {
    vm.runInContext(bundle, context, {
      // Absolute path so v8 coverage can attribute the executed script.
      filename: fileURLToPath(bundleUrl),
    });
  }

  executeBundle();
  await settle();

  async function settle() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
  }

  function payloads() {
    return requests.map((request) => JSON.parse(String(request.init.body)));
  }

  function queuedEvents() {
    const raw = storage.getItem(`cc_queue_${websiteId}`);
    return raw ? JSON.parse(raw) : [];
  }

  function storedSession() {
    const raw = storage.getItem(`cc_session_${websiteId}`);
    return raw ? JSON.parse(raw) : null;
  }

  return {
    window,
    document,
    navigator,
    history,
    location,
    storage,
    requests,
    beacons,
    intervals,
    context,
    executeBundle,
    settle,
    payloads,
    queuedEvents,
    storedSession,

    api() {
      return window.CommandCenterAnalytics;
    },

    advanceTime(milliseconds) {
      currentNow += milliseconds;
    },

    setNow(value) {
      currentNow = value;
    },

    setOnline(value) {
      navigator.onLine = value;
    },

    setVisibility(value) {
      document.visibilityState = value;
    },

    setFetchReject(value) {
      shouldRejectFetch = value;
    },

    setBeaconResult(value) {
      beaconResult = value;
    },

    blockNextFetch() {
      blockFetch = true;
    },

    releaseFetch() {
      blockFetch = false;
      pendingFetchResolver?.();
      pendingFetchResolver = null;
    },

    async dispatchWindow(type) {
      window.dispatchEvent({ type });
      await settle();
    },

    async dispatchDocument(type) {
      document.dispatchEvent({ type });
      await settle();
    },

    async runIntervalsByDelay(delay) {
      for (const timer of [...intervals.values()]) {
        if (timer.delay === delay) {
          timer.callback();
        }
      }
      await settle();
    },

    async runAllIntervals() {
      for (const timer of [...intervals.values()]) {
        timer.callback();
      }
      await settle();
    },
  };
}

export function readRequestPayload(request) {
  return JSON.parse(String(request.init.body));
}

export async function readBeaconPayload(beacon) {
  return JSON.parse(await beacon.body.text());
}
