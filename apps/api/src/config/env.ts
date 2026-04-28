import { z } from 'zod';

const PLACEHOLDER_PREFIX = 'placeholder-';

// Docker compose's ${VAR} interpolation produces an empty string when the
// host env var is unset. Zod's .default() only fires for undefined, so
// coerce "" -> undefined before any string validator that has a default.
function emptyToUndef(v: unknown): unknown {
  return v === '' ? undefined : v;
}

function buildEnvSchema(rawNodeEnv: string | undefined) {
  const isProduction = rawNodeEnv === 'production';

  const placeholderString = (devDefault: string) =>
    isProduction
      ? z
          .string()
          .min(1)
          .refine((s) => !s.startsWith(PLACEHOLDER_PREFIX), {
            message: 'placeholder value detected in production',
          })
      : z.preprocess(emptyToUndef, z.string().min(1).default(devDefault));

  const placeholderUrl = (devDefault: string) =>
    isProduction
      ? z.string().url()
      : z.preprocess(emptyToUndef, z.string().min(1).default(devDefault));

  return z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
    JWT_PRIVATE_KEY: placeholderString(`${PLACEHOLDER_PREFIX}jwt-private-key-dev-only`),
    JWT_PUBLIC_KEY: placeholderString(`${PLACEHOLDER_PREFIX}jwt-public-key-dev-only`),
    COOKIE_DOMAIN: z.string().min(1).default('localhost'),
    SIWE_DOMAIN: z.string().min(1).default('localhost:3000'),
    SIWE_SCHEME: z.enum(['http', 'https']).default('http'),
    RPC_URL_ARBITRUM_SEPOLIA: placeholderUrl('https://placeholder-rpc.example.com'),
    CORS_ORIGINS: z.preprocess(
      emptyToUndef,
      z
        .string()
        .default('http://localhost:3000')
        .transform((s) =>
          s
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
        ),
    ),
  });
}

export type Env = z.infer<ReturnType<typeof buildEnvSchema>>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string) {
    super(`Invalid environment configuration:\n${issues}`);
    this.name = 'EnvValidationError';
  }
}

export function parseEnv(rawEnv: NodeJS.ProcessEnv): Env {
  const schema = buildEnvSchema(rawEnv.NODE_ENV);
  const result = schema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new EnvValidationError(issues);
  }
  return result.data;
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (e) {
    if (e instanceof EnvValidationError) {
      process.stderr.write(`[api] ${e.message}\n`);
      process.exit(1);
    }
    throw e;
  }
}

export const env = loadEnv();
