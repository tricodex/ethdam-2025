// This file was autogenerated by hardhat-viem, do not edit it.
// prettier-ignore
// tslint:disable
// eslint-disable

import "hardhat/types/artifacts";
import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

import { Subcall$Type } from "./Subcall";

declare module "hardhat/types/artifacts" {
  interface ArtifactsMap {
    ["Subcall"]: Subcall$Type;
    ["@oasisprotocol/sapphire-contracts/contracts/Subcall.sol:Subcall"]: Subcall$Type;
  }

  interface ContractTypesMap {
    ["Subcall"]: GetContractReturnType<Subcall$Type["abi"]>;
    ["@oasisprotocol/sapphire-contracts/contracts/Subcall.sol:Subcall"]: GetContractReturnType<Subcall$Type["abi"]>;
  }
}
