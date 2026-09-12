import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Contract, JsonRpcProvider, WebSocketProvider } from 'ethers';
import { env } from './config.js';
import { TxRecord } from './models.js';

const artifactPath = fileURLToPath(
  new URL('../../contracts/artifacts/contracts/Voting.sol/Voting.json', import.meta.url),
);

let artifact;
try {
  artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
} catch {
  console.error('[blockchain] Missing contract artifact. Run: npm run compile (in contracts/) and deploy first.');
}

if (!env.blockchain.contractAddress) {
  console.error('[blockchain] CONTRACT_ADDRESS is not set in server/.env. Chain reads will fail until deployed.');
}

export const abi = artifact?.abi ?? [];

export function getChainProvider() {
  return new JsonRpcProvider(env.blockchain.rpcUrl);
}

export function getReadContract(provider = getChainProvider()) {
  return new Contract(env.blockchain.contractAddress, abi, provider);
}

export const isAdminWallet = (walletAddress) =>
  Boolean(walletAddress) &&
  env.blockchain.adminWalletAddress !== '' &&
  walletAddress.toLowerCase() === env.blockchain.adminWalletAddress;

function normalizeElection(e, votingEnd) {
  return {
    id: Number(e.id),
    name: e.name,
    description: e.description,
    duration: Number(e.duration),
    startTime: Number(e.startTime),
    endTime: votingEnd ?? null,
    isActive: e.isActive,
    ended: e.ended,
  };
}

export async function listElections(currentBlockTs) {
  const contract = getReadContract();
  const ids = await contract.getElectionIds();
  const elections = await Promise.all(
    ids.map(async (id) => {
      const electionId = Number(id);
      const e = await contract.getElection(electionId);
      const end = await contract.getElectionEnd(electionId);
      return normalizeElection(e, Number(end));
    }),
  );

  return { elections, currentBlockTs };
}

export async function getElectionDetail(electionId) {
  const contract = getReadContract();
  const e = await contract.getElection(electionId);
  if (Number(e.id) === 0) return null;

  const end = await contract.getElectionEnd(electionId);
  const results = await contract.getElectionResults(electionId);

  const candidates = results.map((c) => ({
    id: Number(c.id),
    name: c.name,
    description: c.description,
    voteCount: Number(c.voteCount),
  }));

  const winnerId =
    electionEnded(e, Number(end))
      ? candidates.reduce((best, c) => (c.voteCount > (best?.voteCount ?? -1) ? c : best), null)?.id ?? null
      : null;

  return {
    election: normalizeElection(e, Number(end)),
    candidates,
    totalVotes: Number(await contract.totalVotes(electionId)),
    winnerId,
    currentBlockTs: await currentBlockTimestamp(),
  };
}

export function electionEnded(e, endTime) {
  return e.ended || (e.isActive && endTime > 0 && endTime <= Date.now() / 1000);
}

async function currentBlockTimestamp() {
  const block = await getChainProvider().getBlock('latest');
  return block.timestamp;
}

async function recordTx({ txHash, type, walletAddress, electionId, candidateId, blockNumber }) {
  try {
    await TxRecord.findOneAndUpdate(
      { txHash },
      { $setOnInsert: { txHash, type, walletAddress, electionId, candidateId, blockNumber } },
      { upsert: true },
    );
  } catch (error) {
    console.error('[listener] failed to record tx:', error.message);
  }
}

async function recordAdminTx({ txHash, type, electionId, candidateId, blockNumber }) {
  const transaction = await getChainProvider().getTransaction(txHash);
  if (!transaction?.from) throw new Error(`Could not determine sender for ${txHash}`);

  return recordTx({
    txHash,
    type,
    walletAddress: transaction.from.toLowerCase(),
    electionId,
    candidateId,
    blockNumber,
  });
}

export function startEventListener() {
  if (!env.blockchain.wsUrl || !env.blockchain.contractAddress || !abi.length) {
    console.warn('[listener] Skipped — missing ws url, contract address or ABI.');
    return null;
  }

  const ws = new WebSocketProvider(env.blockchain.wsUrl);
  const contract = new Contract(env.blockchain.contractAddress, abi, ws);
  const handlers = [];

  const events = [
    {
      name: 'ElectionCreated',
      apply: (electionId, name, event) =>
        recordAdminTx({
          txHash: event.log.transactionHash,
          type: 'createElection',
          electionId: Number(electionId),
          blockNumber: event.log.blockNumber,
        }),
    },
    {
      name: 'CandidateAdded',
      apply: (electionId, candidateId, name, event) =>
        recordAdminTx({
          txHash: event.log.transactionHash,
          type: 'addCandidate',
          electionId: Number(electionId),
          candidateId: Number(candidateId),
          blockNumber: event.log.blockNumber,
        }),
    },
    {
      name: 'ElectionStarted',
      apply: (electionId, startTime, duration, event) =>
        recordAdminTx({
          txHash: event.log.transactionHash,
          type: 'startElection',
          electionId: Number(electionId),
          blockNumber: event.log.blockNumber,
        }),
    },
    {
      name: 'ElectionEnded',
      apply: (electionId, event) =>
        recordAdminTx({
          txHash: event.log.transactionHash,
          type: 'endElection',
          electionId: Number(electionId),
          blockNumber: event.log.blockNumber,
        }),
    },
    {
      name: 'VoteCast',
      apply: (electionId, candidateId, voter, event) =>
        recordTx({
          txHash: event.log.transactionHash,
          type: 'vote',
          walletAddress: voter.toLowerCase(),
          electionId: Number(electionId),
          candidateId: Number(candidateId),
          blockNumber: event.log.blockNumber,
        }),
    },
  ];

  for (const def of events) {
    contract.on(def.name, (...args) => def.apply(...args).catch((error) => console.error(error)));
    handlers.push(def.name);
  }

  console.log(`[listener] Listening for events: ${handlers.join(', ')} via ${env.blockchain.wsUrl}`);
  return ws;
}
