require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const PK1 = process.env.PK1 == null ? "" : process.env.PK1;

if (PK1 === "") {
  throw new Error("Please set your PK1 in a .env file");
}

const config = {
  networks: {
    hardhat2: {
      url: "https://server03.espanicon.team",
      chainId: 1337,
      gasPrice: 20000000000,
      accounts: [PK1],
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [PK1],
    },
    ethSepolia: {
      url: "https://sepolia.infura.io/v3/ffbf8ebe228f4758ae82e175640275e0",
      chainId: 11155111,
      gasPrice: 20000,
      accounts: [PK1],
    },
  },
  paths: {
    sources: "./solidity/contracts",
    tests: "./solidity/test",
    cache: "./solidity/build/cache",
    artifacts: "./solidity/build/artifacts",
  },
  solidity: {
    version: "0.8.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
};

module.exports = config;
