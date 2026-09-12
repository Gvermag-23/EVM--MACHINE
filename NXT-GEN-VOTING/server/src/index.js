import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config.js';
import { errorHandler, notFound } from './middleware.js';
import { startEventListener } from './blockchain.js';
import authRoutes from './routes/auth.js';
import electionRoutes from './routes/elections.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: (origin, cb) => { if (!origin || env.clientOrigins.includes(origin)) cb(null, true); else cb(new Error('Not allowed by CORS')); } }));
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await mongoose.connect(env.mongoUri);
  console.log('[db] Connected to MongoDB');

  startEventListener();

  app.listen(env.port, () => {
    console.log(`[server] NXT-GEN-VOTING API on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[server] Contract ${env.blockchain.contractAddress} on chain ${env.blockchain.chainId}`);
  });
}

start().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});

export default app;