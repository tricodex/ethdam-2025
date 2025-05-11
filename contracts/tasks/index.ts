import { task } from "hardhat/config";
import "./deploy";
import "./tokens";
import "./test-placement";
import "./deploy-v4";
import "./deploy-v5";
import "./place-order-v5";
import "./wrap-tokens-v5";
import "./request-privacy-v5";
import "./check-privacy-access";

task("accounts", "Show the list of accounts", async (_, hre) => {
  const accounts = await hre.viem.getWalletClients();
  for (const [index, account] of accounts.entries()) {
    console.log(`Account #${index}: ${account.account.address}`);
  }
});

export {};
