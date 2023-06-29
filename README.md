# xcall-sample-dapp

This sample dapp is intended to run locally in a machine that has a local ICON Network, an EVM chain and a relayer running locally and has been setup using the [e2edemo](https://github.com/icon-project/btp2/tree/main/e2edemo) of the [btp2](https://github.com/icon-project/btp2) repository.

In order for this dapp to run correctly you have to first copy the xcall and e2edemo sample dapp smart contracts addresses from the generated `deployments.json` in the e2edemo folder into the `config.js` file of this repo.

```js
require("dotenv").config();
const config = {
  ICON_WALLET_PK:
    "Private key of wallet on ICON chain",
  EVM_WALLET_PK:
    "Private Key of wallet on EVM chain",
  ICON_XCALL_ADDRESS: "Contract address of xCall on ICON",
  ICON_DAPP_ADDRESS: "Contract address of e2edemo Dapp on ICON",
  EVM_XCALL_ADDRESS: "Contract address of xCall on EVM",
  EVM_DAPP_ADDRESS: "Contract address of e2edemo Dapp on EVM",
  EVM_CHAIN_LABEL: "0x539.hardhat",
  ICON_CHAIN_LABEL: "0x3.icon",
  ICON_RPC_URL: process.env.ICON_RPC || "http://localhost:9080/api/v3",
  EVM_RPC_URL: process.env.EVM_RPC || "http://localhost:8545",
  ICON_RPC_NID: 3
};

module.exports = config;
```

## Further Resources
* Local Testing BTP - https://docs.icon.community/cross-chain-communication/xcall/local-testing
