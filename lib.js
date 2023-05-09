require("dotenv").config();
const IconService = require("icon-sdk-js");
const { ethers } = require("hardhat");
const fs = require("fs");

const {
  IconWallet,
  IconBuilder,
  SignedTransaction,
  IconConverter,
  HttpProvider,
} = IconService.default;

const { CallTransactionBuilder, CallBuilder } = IconBuilder;

class TestXcall {
  constructor(props) {
    this.httpProvider = new HttpProvider(props.rpc.icon);
    this.iconService = new IconService.default(this.httpProvider);
    this.wallets = props.wallet;
    this.nid = props.nid;
    this.contracts = props.contract;
    this.ethers = ethers;
    this.iconWallet = IconWallet.loadKeystore(
      this.getKeystore(this.wallets.icon.keystorePath),
      this.wallets.icon.password
    );
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

  async getCallMessageEvent(txHash, maxLoops = 10) {
    for (let i = 0; i < maxLoops; i++) {
      const eventlogs = await this.getEventLogs(txHash);
      if (eventlogs != null && eventlogs.length > 2) {
        return eventlogs[2];
      }
      await this.sleep(1000);
    }

    return null;
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
}

module.exports = TestXcall;
