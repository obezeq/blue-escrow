import { describe, it, expect } from 'vitest';
import { parseEnv, EnvValidationError } from './env.js';

const validBaseEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://localhost:5432/blue_escrow',
} as NodeJS.ProcessEnv;

describe('parseEnv', () => {
  it('parses minimal valid env with placeholder defaults in development', () => {
    const env = parseEnv(validBaseEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.JWT_PRIVATE_KEY).toContain('placeholder-');
    expect(env.JWT_PUBLIC_KEY).toContain('placeholder-');
    expect(env.RPC_URL_ARBITRUM_SEPOLIA).toContain('placeholder-rpc');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000']);
    expect(env.SIWE_SCHEME).toBe('http');
    expect(env.COOKIE_DOMAIN).toBe('localhost');
    expect(env.SIWE_DOMAIN).toBe('localhost:3000');
  });

  it('treats empty string CORS_ORIGINS as undefined and falls back to default', () => {
    const env = parseEnv({ ...validBaseEnv, CORS_ORIGINS: '' });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('treats empty string JWT keys as undefined in development', () => {
    const env = parseEnv({ ...validBaseEnv, JWT_PRIVATE_KEY: '', JWT_PUBLIC_KEY: '' });
    expect(env.JWT_PRIVATE_KEY).toContain('placeholder-');
    expect(env.JWT_PUBLIC_KEY).toContain('placeholder-');
  });

  it('parses CORS_ORIGINS as a comma-separated list with trim and filter', () => {
    const env = parseEnv({
      ...validBaseEnv,
      CORS_ORIGINS: 'http://a.com, http://b.com  ,  http://c.com',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
  });

  it('coerces PORT string to number', () => {
    const env = parseEnv({ ...validBaseEnv, PORT: '3001' });
    expect(env.PORT).toBe(3001);
  });

  it('throws EnvValidationError when DATABASE_URL is missing in production', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(
      EnvValidationError,
    );
  });

  it('throws EnvValidationError when JWT_PRIVATE_KEY uses placeholder in production', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/x',
        JWT_PRIVATE_KEY: 'placeholder-jwt-private-key-dev-only',
        JWT_PUBLIC_KEY: 'real-public-key',
        RPC_URL_ARBITRUM_SEPOLIA: 'https://real-rpc.example.com',
        COOKIE_DOMAIN: 'blueescrow.com',
        SIWE_DOMAIN: 'blueescrow.com',
        SIWE_SCHEME: 'https',
        CORS_ORIGINS: 'https://blueescrow.com',
      } as NodeJS.ProcessEnv),
    ).toThrow(EnvValidationError);
  });

  it('throws EnvValidationError on invalid SIWE_SCHEME', () => {
    expect(() => parseEnv({ ...validBaseEnv, SIWE_SCHEME: 'ftp' })).toThrow(
      EnvValidationError,
    );
  });

  it('throws EnvValidationError on non-URL DATABASE_URL', () => {
    expect(() => parseEnv({ ...validBaseEnv, DATABASE_URL: 'not-a-url' })).toThrow(
      EnvValidationError,
    );
  });
});
