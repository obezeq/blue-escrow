import { pinoHttp } from 'pino-http';
import { ulid } from 'ulid';
import { logger } from '../utils/logger.js';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (_req, res) => {
    const existing = res.getHeader('x-request-id');
    return typeof existing === 'string' ? existing : ulid();
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
