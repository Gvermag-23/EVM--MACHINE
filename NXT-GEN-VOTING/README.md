# NXT-GEN-VOTING

A simple, working decentralized voting platform. Elections and votes live on an EVM chain (Hardhat locally); the Express API + MongoDB store only user, metadata and transaction records.

## How it works

- React + Vite + Tailwind frontend connects a MetaMask wallet and signs an ownership proof to sign in.
- Admin (deployer wallet) creates elections, adds candidates, starts/ends elections.
- Voters pick a candidate; the vote is a MetaMask transaction — the contract rejects duplicate votes.
- The backend reads results from the chain and an event listener records every on-chain event in MongoDB.

## Repository layout

- `client/` — React UI (`src/AppContext.jsx`, `src/contract.js`, `src/pages/*`)
- `server/` — Express API, MongoDB models, blockchain service (`src/blockchain.js`) and event listener
- `contracts/` — Voting.sol, tests (`test/Voting.test.js`), deploy script (`scripts/deploy.js`)
- `blockchain/` — generated `addresses.json` + ABI
- `docs/` — documentation

## Requirements

- Node.js 20+, npm
- Docker (for MongoDB) or a local MongoDB
- MetaMask browser extension

## 1. Environment

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

The deploy script automatically updates `CONTRACT_ADDRESS` and `ADMIN_WALLET_ADDRESS` in `server/.env`.

## 2. Install dependencies

```powershell
cd client; npm install
cd ..\server; npm install
cd ..\contracts; npm install
```

## 3. Start services

```powershell
# MongoDB
docker compose up -d mongodb

# Local EVM chain (leave running)
cd contracts; npx hardhat node
```

## 4. Compile, test, deploy

```powershell
cd contracts
npm run compile
npm test            # contract test suite
npx hardhat run scripts/deploy.js --network localhost
```

The deploy script writes the address to `blockchain/addresses.json`, `client/src/addresses.json`, and `server/.env`.

## 5. Run the app

```powershell
cd server; npm run dev        # terminal 1 → http://localhost:5000/api/health
cd client; npm run dev        # terminal 2 → http://localhost:5173
```

## 6. Use it in MetaMask

1. Add the Hardhat network: chain id `31337`, RPC `http://127.0.0.1:8545`, currency ETH.
2. Import the first account printed by `hardhat node` — it is the deployer/admin.
3. Open the app, connect the wallet, sign in.
4. The admin panel lets you create elections, add candidates, and start/end them.

## Scripts

| Package | Command | Purpose |
| --- | --- | --- |
| contracts | `npm run compile` | Compile Solidity |
| contracts | `npm test` | Run contract tests |
| contracts | `npm run node` | Start Hardhat chain (chain id 31337) |
| server | `npm run dev` | Express API + event listener |
| client | `npm run dev` | Vite dev server (port 5173) |

## Security

- Private keys never leave `server/.env` (and are never stored in DB or sent to the browser).
- The contract enforces admin-only actions and prevents double voting.
- API is rate-limited, CORS-restricted to the client origin, and validates addresses/tx hashes server-side.
