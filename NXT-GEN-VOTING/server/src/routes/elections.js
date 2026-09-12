import { Router } from 'express';
import * as chain from '../blockchain.js';
import { CandidateMetadata, ElectionMetadata, TxRecord } from '../models.js';
import { asyncHandler, requireAdmin, requireAuth } from '../middleware.js';

const router = Router();

const positiveId = (id) => Number.isInteger(id) && id > 0;
const validCandidateId = (id) => Number.isInteger(id) && id >= 0;

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const block = await chain.getChainProvider().getBlock('latest');
    const data = await chain.listElections(block.timestamp);
    return res.json(data);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!positiveId(id)) return res.status(400).json({ error: 'Invalid election id' });

    const detail = await chain.getElectionDetail(id);
    if (!detail) return res.status(404).json({ error: 'Election not found' });

    const [meta, candidatesMeta] = await Promise.all([
      ElectionMetadata.findOne({ electionId: id }),
      CandidateMetadata.find({ electionId: id }),
    ]);

    const bios = new Map(candidatesMeta.map((c) => [c.candidateId, c.bio]));

    return res.json({
      ...detail,
      note: meta?.note ?? '',
      candidates: detail.candidates.map((c) => ({ ...c, bio: bios.get(c.id) ?? '' })),
    });
  }),
);

router.get(
  '/admin/isAdmin',
  requireAuth,
  asyncHandler(async (req, res) => res.json({ isAdmin: chain.isAdminWallet(req.walletAddress) })),
);

router.post(
  '/:id/note',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const note = String(req.body.note ?? '').trim();
    if (!positiveId(id) || !note) return res.status(400).json({ error: 'Election id and note are required' });

    await ElectionMetadata.findOneAndUpdate({ electionId: id }, { $set: { note } }, { upsert: true });
    return res.json({ ok: true });
  }),
);

router.post(
  '/:id/candidates/:candidateId/bio',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const candidateId = Number(req.params.candidateId);
    const bio = String(req.body.bio ?? '').trim();
    if (!positiveId(id) || !validCandidateId(candidateId) || !bio) {
      return res.status(400).json({ error: 'Election id, candidate id and bio are required' });
    }

    await CandidateMetadata.findOneAndUpdate(
      { electionId: id, candidateId },
      { $set: { bio } },
      { upsert: true },
    );
    return res.json({ ok: true });
  }),
);

router.get(
  '/me/txns',
  requireAuth,
  asyncHandler(async (req, res) => {
    const walletAddress = req.walletAddress;
    if (!isWalletAddress(walletAddress)) return res.status(400).json({ error: 'Invalid wallet address' });

    const txns = await TxRecord.find({ walletAddress }).sort({ createdAt: -1 }).limit(100);
    return res.json({ txns });
  }),
);

export default router;
