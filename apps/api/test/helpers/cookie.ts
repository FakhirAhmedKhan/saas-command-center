import type { Response } from 'supertest';

import { readSetCookies } from './response';

export function readFirstSetCookie(response: Response): string {
    const cookies = readSetCookies(response);

    const firstCookie = cookies.at(0);

    if (!firstCookie) {
        throw new Error('Expected a Set-Cookie header but none was returned.');
    }

    return firstCookie;
}

export function readCookiePair(setCookie: string): string {
    const separatorIndex = setCookie.indexOf(';');

    return separatorIndex === -1 ? setCookie : setCookie.slice(0, separatorIndex);
}

export function readCookieName(cookiePair: string): string {
    const equalsIndex = cookiePair.indexOf('=');

    if (equalsIndex <= 0) {
        throw new Error(`Invalid cookie pair: "${cookiePair}"`);
    }

    return cookiePair.slice(0, equalsIndex);
}

export function readCookieValue(cookiePair: string): string {
    const equalsIndex = cookiePair.indexOf('=');

    if (equalsIndex <= 0) {
        throw new Error(`Invalid cookie pair: "${cookiePair}"`);
    }

    const value = cookiePair.slice(equalsIndex + 1);

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function buildCookieWithValue(cookiePair: string, value: string): string {
    return `${readCookieName(cookiePair)}=${encodeURIComponent(value)}`;
}