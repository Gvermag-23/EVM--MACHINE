import jwt from 'jsonwebtoken';
import { env } from './config.js';

export const isWalletAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value);
export const isTxHash = (value) => /^0x[a-fA-F0-9]{64}$/.test(value);

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.walletAddress = payload.walletAddress.toLowerCase();
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.walletAddress) return requireAuth(req, res, next);
  if (req.walletAddress !== env.blockchain.adminWalletAddress) {
    return res.status(403).json({ error: 'Admin only' });
  }
  return next();
};

export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' });

export const errorHandler = (error, _req, res, _next) => {
  console.error('[error]', error);
  if (error.name === 'MongooseError' || error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: 'Duplicate value' });
  }
  return res.status(500).json({ error: error.message ?? 'Internal server error' });
};

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);