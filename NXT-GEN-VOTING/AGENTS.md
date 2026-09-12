# AGENTS.md

Guidance for AI agents working in this repository.

## Project

NXT-GEN-VOTING — a simple, live decentralized voting platform.

- `client/` — React + Vite + Tailwind (browser only)
- `server/` — Express + MongoDB/Mongoose API + blockchain service + event listener
- `contracts/` — Hardhat Solidity (Voting.sol), tests, deploy script
- `blockchain/` — generated `addresses.json` and ABI (produced by deploy)
- `docs/` — documentation

## Rules (non-negotiable)

- Source of truth: the chain. MongoDB stores only users, election/candidate metadata and tx records.
- Never store/log private keys; never expose them to the client. Deployer key for testnets lives only in `contracts/.env`.
- No placeholder/fake code. Everything must work when run.
- Keep frontend, backend, contracts separated. Prefer fewer, well-named files over over-engineering.
- The contract must block double voting (`hasVoted` mapping) and restrict admin actions (`onlyOwner`).

## Common commands

```powershell
cd NXT-GEN-VOTING\contracts; npm run compile; npm test
cd NXT-GEN-VOTING\contracts; npx hardhat run scripts/deploy.js --network localhost
cd NXT-GEN-VOTING\server; npm run dev
cd NXT-GEN-VOTING\client; npm run dev
docker compose up -d mongodb
```

## Conventions

- ESM everywhere (`"type": "module"`).
- Client: `src/AppContext.jsx` (wallet+auth context), `src/contract.js` (MetaMask writes), `src/api.js` (axios), `src/pages/*`, `src/components/*`.
- Server: `src/index.js` (bootstrap), `src/config.js`, `src/models.js` (all schemas), `src/blockchain.js` (chain reads + event listener), `src/routes/*`, `src/middleware.js`.
- Contract must deploy before the client/server work: deploy writes the address to `client/src/addresses.json`, `blockchain/addresses.json`, and `server/.env`.
- Vite exposes only `VITE_*` env vars to the browser.
- Do not add code comments unless the user asks.
