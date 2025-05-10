import { task } from "hardhat/config";
import "./deploy";
import "./tokens";
import "./test-placement";

task("accounts", "Show the list of accounts", async (_, hre) => {
  const accounts = await hre.viem.getWalletClients();
  for (const [index, account] of accounts.entries()) {
    console.log(`Account #${index}: ${account.account.address}`);
  }
});

export {};
