export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
  contractAddress: (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').toLowerCase(),
  rpcUrl: import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545',
};