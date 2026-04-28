// Side-effect first: BigInt.prototype.toJSON must be installed before any
// response containing Prisma BigInt columns is serialized.
import './shared/utils/bigint.js';

import express, { Router, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestId } from './shared/middleware/requestId.js';
import { httpLogger } from './shared/middleware/pinoHttp.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { success } from './shared/utils/response.js';
import { authRouter } from './features/auth/auth.routes.js';

const app: Express = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(requestId);

// /health is mounted before pinoHttp so liveness probes are silent (k8s/docker
// convention). requestId still runs first, so the x-request-id header is echoed.
app.get('/health', (_req, res) => {
  res.json(success({ status: 'ok' }));
});

app.use(httpLogger);
app.use(express.json({ limit: '64kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser());

const v1Router: Router = Router();
v1Router.use('/auth', authRouter);
app.use('/v1', v1Router);

app.use(errorHandler);

export { app, v1Router };
