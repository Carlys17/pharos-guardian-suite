import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(signer.address);
  console.log('Wallet:', signer.address);
  console.log('Balance:', ethers.formatEther(bal), 'PHRS');
}

main().catch(console.error);
