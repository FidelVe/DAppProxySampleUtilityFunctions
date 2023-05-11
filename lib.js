require("dotenv").config();
const IconService = require("icon-sdk-js");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const fs = require("fs");
const Web3Utils = require("web3-utils");

const {
  IconWallet,
  IconBuilder,
  SignedTransaction,
  IconConverter,
  HttpProvider,
} = IconService.default;

const { CallTransactionBuilder, CallBuilder } = IconBuilder;

const deployments = getDeployments();
const defaultProps = {
  rpc: {
    icon:
      process.env.ICON_RPC === "" || process.env.ICON_RPC == null
        ? "http://localhost:9080/api/v3"
        : process.env.ICON_RPC,
    hardhat: "",
  },
  nid: {
    icon: 3,
  },
  wallet: {
    icon: {
      keystorePath: "./wallets/icon_keystore.json",
      password: "gochain",
    },
  },
  contract: {
    xcall: {
      icon: deployments.icon.contracts.xcall,
      hardhat: deployments.hardhat.contracts.xcall,
    },
    dapp: {
      icon: "",
      hardhat: deployments.hardhat.contracts.dapp,
    },
  },
  network: {
    icon: deployments.icon.network,
    hardhat: deployments.hardhat.network,
  },
};

class TestXcall {
  constructor(props = defaultProps) {
    this.httpProvider = new HttpProvider(props.rpc.icon);
    this.iconService = new IconService.default(this.httpProvider);
    this.wallets = props.wallet;
    this.nid = props.nid;
    this.contracts = props.contract;
    this.ethers = ethers;
    this.network = props.network;
    this.iconWallet = IconWallet.loadKeystore(
      this.getKeystore(this.wallets.icon.keystorePath),
      this.wallets.icon.password
    );
  }

  encodeMessage(msg) {
    const encoded = Web3Utils.fromUtf8(msg);
    return encoded;
  }

  decodeMessage(msg) {
    const decoded = Web3Utils.hexToString(msg);
    return decoded;
  }

  getKeystore(path) {
    const keystore = fs.readFileSync(path, "utf8");
    return JSON.parse(keystore);
  }

  async sendCallMessage(to, data, useRollback = true) {
    void useRollback;
    try {
      const wallet = this.iconWallet;

      const txObj = new CallTransactionBuilder()
        .from(wallet.getAddress())
        .to(this.contracts.xcall.icon)
        .stepLimit(IconConverter.toBigNumber(2000000))
        .nid(IconConverter.toBigNumber(this.nid.icon))
        .nonce(IconConverter.toBigNumber(1))
        .version(IconConverter.toBigNumber(3))
        .timestamp(new Date().getTime() * 1000)
        .method("sendCallMessage")
        .params({
          _to: to,
          _data: data,
        })
        .build();
      return await this.sendTx(txObj, wallet);
    } catch (e) {
      console.log(e);
    }
  }

  getBtpAddress(network, address) {
    return `btp://${network}/${address}`;
  }

  getCallMessageSentEvent(event) {
    const indexed = event[0].indexed || [];
    const data = event[0].data || [];
    return {
      _from: indexed[1],
      _to: indexed[2],
      _sn: BigNumber.from(indexed[3]),
      _nsn: BigNumber.from(data[0]),
    };
  }

  async getEventLogs(txHash) {
    const txResult = await this.getTransactionResult(txHash);
    if (txResult && txResult.eventLogs.length > 0) {
      return txResult.eventLogs;
    }
    return null;
  }

  async sleep(time) {
    await new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }

  filterEventIconChain(eventlogs, sig, address) {
    return eventlogs.filter((event) => {
      return (
        event.indexed &&
        event.indexed[0] === sig &&
        (!address || address === event.scoreAddress)
      );
    });
  }

  filterEventEvmChain(contract, filter, receipt) {
    const inf = contract.interface;
    const address = contract.address;
    const topics = filter.topics || [];
    if (receipt.events && typeof topics[0] === "string") {
      const fragment = inf.getEvent(topics[0]);
      return receipt.events
        .filter((event) => {
          if (event.address == address) {
            return topics.every((v, i) => {
              if (!v) {
                return true;
              } else if (typeof v === "string") {
                return v === event.topics[i];
              } else {
                return v.includes(event.topics[i]);
              }
            });
          }
          return false;
        })
        .map((event) => {
          return {
            args: inf.decodeEventLog(fragment, event.data, event.topics),
          };
        });
    }
    return [];
  }

  async checkCallExecuted(receipts, contract) {
    let event;
    const logs = this.filterEventEvmChain(
      contract,
      contract.filters.CallExecuted(),
      receipts
    );
    if (logs.length > 0) {
      event = logs[0].args;
    }
    return event;
  }

  async verifyReceivedMessage(receipts) {
    const contract = await this.getDappProxyContract();
    let event;
    const logs = this.filterEventEvmChain(
      contract,
      contract.filters.MessageReceived(),
      receipts
    );
    if (logs.length > 0) {
      event = logs[0].args;
    }
    return event;
  }

  async waitEventEvmChain(contract, filterCM) {
    let height = await contract.provider.getBlockNumber();
    let next = height + 1;

    while (true) {
      if (height == next) {
        await this.sleep(1000);
        next = (await contract.provider.getBlockNumber()) + 1;
        continue;
      }
      for (; height < next; height++) {
        console.log(`waitEventEvmChain: ${height} -> ${next}`);
        const events = await contract.queryFilter(filterCM, height);
        if (events.length > 0) {
          return events;
        }
      }
    }
  }

  async makeReadonlyCall(to, method, params) {
    const txObj = new CallBuilder()
      .to(to)
      .method(method)
      .params(params)
      .build();
    return await this.iconService.call(txObj).execute();
  }

  async getTransactionResult(txHash) {
    for (let i = 0; i < 10; i++) {
      try {
        const txResult = await this.iconService
          .getTransactionResult(txHash)
          .execute();
        return txResult;
      } catch (e) {
        console.log(`txResult (pass ${i}):`, e);
      }
      await this.sleep(1000);
    }
  }

  async sendTx(txObj, wallet) {
    const signedTransaction = new SignedTransaction(txObj, wallet);
    return await this.iconService.sendTransaction(signedTransaction).execute();
  }

  // hardhat related methods
  async getCallServiceContract() {
    return await ethers.getContractAt(
      "CallService",
      this.contracts.xcall.hardhat
    );
  }

  async getDappProxyContract() {
    return await ethers.getContractAt(
      "DAppProxySample",
      this.contracts.dapp.hardhat
    );
  }

  async executeCall(reqId) {
    try {
      const params = { gasLimit: 15000000 };
      const contract = await this.getCallServiceContract();
      const tx = await contract.executeCall(reqId, params);
      const receipt = await tx.wait(1);
      return receipt;
    } catch (e) {
      console.log("error running executeCall");
      console.log(e);
    }
  }
}

function getDeployments() {
  const f = fs.readFileSync("./deployments.json", "utf8");
  const ff = JSON.parse(f);
  const result = {
    icon: {},
    hardhat: { ...ff.hardhat },
  };

  if (ff.icon != null) {
    result.icon = { ...ff.icon };
  } else if (ff.icon0 != null) {
    result.icon = { ...ff.icon0 };
  }

  return result;
}

module.exports = TestXcall;
