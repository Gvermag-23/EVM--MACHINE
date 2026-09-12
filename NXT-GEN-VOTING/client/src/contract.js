import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { config } from './config.js';
import votingArtifact from '../../contracts/artifacts/contracts/Voting.sol/Voting.json';
import addresses from './addresses.json';

export const contractAddress = (addresses[String(config.chainId)] ?? config.contractAddress).toLowerCase();

const toHex = (value) => '0x' + Number(value).toString(16);

export const readProvider = () => new JsonRpcProvider(config.rpcUrl);

export function readContract() {
  return new Contract(contractAddress, votingArtifact.abi, readProvider());
}

export function hasMetaMask() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function getSigner() {
  if (!hasMetaMask()) throw new Error('MetaMask is required');
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function ensureChain() {
  const params = [
    {
      chainId: toHex(config.chainId),
      chainName: 'Hardhat Local',
      rpcUrls: [config.rpcUrl],
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: [],
    },
  ];

  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: toHex(config.chainId) }] });
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params });
    } else {
      throw error;
    }
  }
}

export async function writeContract() {
  const signer = await getSigner();
  return new Contract(contractAddress, votingArtifact.abi, signer);
}

export async function hasVoted(electionId, walletAddress) {
  const contract = readContract();
  return contract.hasVoted(electionId, walletAddress);
}

export async function executeCreateElection(name, description, durationSeconds) {
  const contract = await writeContract();
  const tx = await contract.createElection(name, description, durationSeconds);
  return tx.wait();
}

export async function executeAddCandidate(electionId, name, description) {
  const contract = await writeContract();
  const tx = await contract.addCandidate(electionId, name, description);
  return tx.wait();
}

export async function executeStartElection(electionId) {
  const contract = await writeContract();
  const tx = await contract.startElection(electionId);
  return tx.wait();
}

export async function executeEndElection(electionId) {
  const contract = await writeContract();
  const tx = await contract.endElection(electionId);
  return tx.wait();
}

export async function executeVote(electionId, candidateId) {
  const contract = await writeContract();
  const tx = await contract.vote(electionId, candidateId);
  return tx.wait();
}