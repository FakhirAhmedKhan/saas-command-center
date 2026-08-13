import { getAllowedOrigins, parseTrustProxy, type TypedConfigService } from './runtime-config';

function configWith(corsOrigins: string): TypedConfigService {
  return {
    get: () => corsOrigins,
  } as unknown as TypedConfigService;
}

describe('getAllowedOrigins', () => {
  it('returns a single configured origin', () => {
    expect(getAllowedOrigins(configWith('http://localhost:3000'))).toEqual(new Set(['http://localhost:3000']));
  });

  it('splits a comma separated list', () => {
    expect(getAllowedOrigins(configWith('http://a.test,https://b.test'))).toEqual(new Set(['http://a.test', 'https://b.test']));
  });

  it('trims surrounding whitespace', () => {
    expect(getAllowedOrigins(configWith('  http://a.test ,  https://b.test  '))).toEqual(new Set(['http://a.test', 'https://b.test']));
  });

  it('drops empty entries', () => {
    expect(getAllowedOrigins(configWith('http://a.test,,   ,https://b.test'))).toEqual(new Set(['http://a.test', 'https://b.test']));
  });

  it('returns an empty set for a blank value', () => {
    expect(getAllowedOrigins(configWith('   '))).toEqual(new Set());
  });

  it('de-duplicates repeated origins', () => {
    expect(getAllowedOrigins(configWith('http://a.test,http://a.test')).size).toBe(1);
  });
});

describe('parseTrustProxy', () => {
  it('maps the literal "true" to a boolean', () => {
    expect(parseTrustProxy('true')).toBe(true);
  });

  it('maps the literal "false" to a boolean', () => {
    expect(parseTrustProxy('false')).toBe(false);
  });

  it.each([
    ['0', 0],
    ['1', 1],
    ['2', 2],
  ])('maps the numeric hop count %s to %i', (input, expected) => {
    expect(parseTrustProxy(input)).toBe(expected);
  });

  it('passes a negative number through as a string', () => {
    expect(parseTrustProxy('-1')).toBe('-1');
  });

  it('passes a non-integer through as a string', () => {
    expect(parseTrustProxy('1.5')).toBe('1.5');
  });

  it('passes a CIDR or hostname through unchanged', () => {
    expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');

    expect(parseTrustProxy('loopback')).toBe('loopback');
  });
});
