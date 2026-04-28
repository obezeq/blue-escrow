import { pino, type LoggerOptions } from 'pino';
import { env } from '../../config/env.js';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.signature',
  '*.nonce',
  '*.privateKey',
  '*.jwt',
  '*.password',
];

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACT_PATHS,
    remove: false,
    censor: '[REDACTED]',
  },
};

if (env.NODE_ENV === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  };
}

export const logger = pino(options);
