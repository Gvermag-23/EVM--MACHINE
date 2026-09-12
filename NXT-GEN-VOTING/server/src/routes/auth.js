import { Router } from 'express';
import { randomInt } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { User } from '../models.js';
import { env } from '../config.js';
import { asyncHandler, isWalletAddress, requireAuth } from '../middleware.js';

const router = Router();

const buildMessage = (nonce) => `NXT-GEN-VOTING\nSign this message to prove you own this wallet.\nNonce: ${nonce}`;

router.post(
  '/challenge',
  asyncHandler(async (req, res) => {
    const walletAddress = String(req.body.walletAddress ?? '').toLowerCase();
    if (!isWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'A valid wallet address is required' });
    }

    const nonce = String(randomInt(100000, 999999));
    await User.findOneAndUpdate(
      { walletAddress },
      { $set: { nonce } },
      { upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({ message: buildMessage(nonce) });
  }),
);

router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const walletAddress = String(req.body.walletAddress ?? '').toLowerCase();
    const signature = String(req.body.signature ?? '');

    if (!isWalletAddress(walletAddress) || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature are required' });
    }

    const user = await User.findOne({ walletAddress });
    if (!user || !user.nonce) {
      return res.status(401).json({ error: 'Request a challenge first' });
    }

    let recovered;
    try {
      recovered = ethers.verifyMessage(buildMessage(user.nonce), signature).toLowerCase();
    } catch {
      return res.status(401).json({ error: 'Could not recover signer from signature' });
    }

    if (recovered !== walletAddress) {
      return res.status(401).json({ error: 'Signature does not match wallet address' });
    }

    user.nonce = '';
    user.displayName = user.displayName || walletAddress.slice(0, 6);
    await user.save();

    const token = jwt.sign({ walletAddress }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

    return res.json({ token, user: { walletAddress, displayName: user.displayName } });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ walletAddress: req.walletAddress });
    return res.json({ user });
  }),
);

export default router;