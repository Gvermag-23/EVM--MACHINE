import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nxt_gen_voting',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),

  rateLimit: {
    windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.API_RATE_LIMIT_MAX ?? 300),
  },

  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  blockchain: {
    rpcUrl: process.env.RPC_URL ?? 'http://127.0.0.1:8545',
    wsUrl: process.env.WS_RPC_URL ?? 'ws://127.0.0.1:8545',
    contractAddress: process.env.CONTRACT_ADDRESS ?? '',
    chainId: Number(process.env.CHAIN_ID ?? 31337),
    adminWalletAddress: (process.env.ADMIN_WALLET_ADDRESS ?? '').toLowerCase(),
  },
};