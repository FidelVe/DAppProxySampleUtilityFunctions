require("dotenv").config();
const config = {
  ICON_WALLET_PK:
    "573b555367d6734ea0fecd0653ba02659fa19f7dc6ee5b93ec781350bda27376",
  EVM_WALLET_PK:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  ICON_XCALL_ADDRESS: "cx415075b2b19ebef2f2b883c80a8118446ba1a978",
  ICON_DAPP_ADDRESS: "cx5701197a9b76ee7cafd7916b2f55da384350c20b",
  EVM_XCALL_ADDRESS: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  EVM_DAPP_ADDRESS: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  EVM_CHAIN_LABEL: "0x539.hardhat",
  ICON_CHAIN_LABEL: "0x3.icon",
  ICON_RPC_URL: process.env.ICON_RPC || "http://localhost:9080/api/v3",
  EVM_RPC_URL: process.env.EVM_RPC || "http://localhost:8545",
  ICON_RPC_NID: 3
};

module.exports = config;
