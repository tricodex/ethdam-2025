// This file was autogenerated by hardhat-viem, do not edit it.
// prettier-ignore
// tslint:disable
// eslint-disable

import "hardhat/types/artifacts";
import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

import { ERC2771Context$Type } from "./ERC2771Context";

declare module "hardhat/types/artifacts" {
  interface ArtifactsMap {
    ["ERC2771Context"]: ERC2771Context$Type;
    ["contracts/confidentialERC20/ERC2771Context.sol:ERC2771Context"]: ERC2771Context$Type;
  }

  interface ContractTypesMap {
    ["ERC2771Context"]: GetContractReturnType<ERC2771Context$Type["abi"]>;
    ["contracts/confidentialERC20/ERC2771Context.sol:ERC2771Context"]: GetContractReturnType<ERC2771Context$Type["abi"]>;
  }
}
