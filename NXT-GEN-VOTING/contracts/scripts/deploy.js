import hre from 'hardhat';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function updateEnvValue(filePath, key, value) {
  try {
    const current = readFileSync(filePath, 'utf8');
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    writeFileSync(filePath, pattern.test(current) ? current.replace(pattern, line) : `${current.trimEnd()}\n${line}\n`);
  } catch (error) {
    console.warn(`Could not update ${filePath}: ${error.message}`);
  }
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log(`Deploying Voting to network ${network.name} (chainId ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const factory = await hre.ethers.getContractFactory('Voting');
  const voting = await factory.deploy();
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log(`Voting deployed to ${address}`);

  const chainKey = String(network.chainId);

  const chainAddresses = readJson(path.join(rootDir, 'blockchain', 'addresses.json'));
  chainAddresses[chainKey] = address;
  writeJson(path.join(rootDir, 'blockchain', 'addresses.json'), chainAddresses);

  const clientAddresses = readJson(path.join(rootDir, 'client', 'src', 'addresses.json'));
  clientAddresses[chainKey] = address;
  writeJson(path.join(rootDir, 'client', 'src', 'addresses.json'), clientAddresses);

  const serverEnvPath = path.join(rootDir, 'server', '.env');
  updateEnvValue(serverEnvPath, 'CONTRACT_ADDRESS', address);
  updateEnvValue(serverEnvPath, 'ADMIN_WALLET_ADDRESS', deployer.address);

  console.log(`Wrote address ${address} to blockchain/addresses.json, client/src/addresses.json, and server/.env`);

  const abi = voting.interface.format('json');
  const abiPath = path.join(rootDir, 'blockchain', 'Voting.abi.json');
  writeJson(abiPath, abi);
  console.log(`Wrote ABI to ${abiPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
