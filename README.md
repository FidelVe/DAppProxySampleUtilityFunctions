# xcall-sample-dapp

This sample dapp is intended to run locally in a machine that has a local ICON Network, an EVM chain and a relayer running locally and has been setup using the [e2edemo](https://github.com/icon-project/btp2/tree/main/e2edemo) of the [btp2](https://github.com/icon-project/btp2) repository.

In order for this dapp to run correctly you have to first copy the xcall and e2edemo sample dapp smart contracts addresses from the generated `deployments.json` in the e2edemo folder into this `index.js` file in the constants section.

```js
// IMPORTS
require("dotenv").config();
const IconService = require("icon-sdk-js");
const { ethers } = require("ethers");
const { BigNumber } = ethers;
const Web3Utils = require("web3-utils");
const fs = require("fs");

// CONSTANTS
// CHANGE THIS VALUES TO YOUR OWN

const ICON_WALLET_PK =
  "573b555367d6734ea0fecd0653ba02659fa19f7dc6ee5b93ec781350bda27376";
const EVM_WALLET_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ICON_XCALL_ADDRESS = "cx17cb94775d2f774277bfbf3477be5f36ca5af37f";
const EVM_XCALL_ADDRESS = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
const EVM_DAPP_ADDRESS = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
const EVM_CHAIN_LABEL = "0x539.hardhat";
const ICON_CHAIN_LABEL = "0x3.icon";

...
```
