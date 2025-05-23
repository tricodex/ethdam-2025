// This file was autogenerated by hardhat-viem, do not edit it.
// prettier-ignore
// tslint:disable
// eslint-disable

import "hardhat/types/artifacts";
import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

import { PrivateWrapper$Type } from "./PrivateWrapper";

declare module "hardhat/types/artifacts" {
  interface ArtifactsMap {
    ["PrivateWrapper"]: PrivateWrapper$Type;
    ["contracts/confidentialERC20/PrivateWrapper.sol:PrivateWrapper"]: PrivateWrapper$Type;
  }

  interface ContractTypesMap {
    ["PrivateWrapper"]: GetContractReturnType<PrivateWrapper$Type["abi"]>;
    ["contracts/confidentialERC20/PrivateWrapper.sol:PrivateWrapper"]: GetContractReturnType<PrivateWrapper$Type["abi"]>;
  }
}
