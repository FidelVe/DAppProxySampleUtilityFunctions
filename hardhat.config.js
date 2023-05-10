require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const PK1 = process.env.PK1 == null ? "" : process.env.PK1;

const config = {
  networks: {
    hardhat2: {
      url: "https://server03.espanicon.team",
      chainId: 1337,
      gasPrice: 20000000000,
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
