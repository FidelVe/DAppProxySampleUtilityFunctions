require("dotenv").config();
const IconService = require("icon-sdk-js");
const fs = require("fs");

const {
  IconWallet,
  IconBuilder,
  SignedTransaction,
  IconConverter,
  HttpProvider
} = IconService.default;

const { CallTransactionBuilder, CallBuilder } = IconBuilder;

class TestXcall {
  constructor(props) {
    this.httpProvider = new HttpProvider(props.rpc.icon);
    this.iconService = new IconService.default(this.httpProvider);
    this.wallets = props.wallet;
    this.nid = props.nid;
    this.contracts = props.contract;
  }

  getKeyStore(path) {
    const keystore = fs.readFileSync(path, "utf8");
    return JSON.parse(keystore);
  }

  async sendCallMessage(to, data, useRollback = true) {
    void useRollback;
    try {
      const wallet = IconWallet.loadKeystore(
        this.getKeystore(this.wallets.icon.keystorePath),
        this.wallets.icon.password
      );

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
          _data: data
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

  async sleep(time) {
    await new Promise(resolve => {
      setTimeout(resolve, time);
    });
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
    return await this.iconService.getTransactionResult(txHash).execute();
  }

  async sendTx(txObj, wallet) {
    const signedTransaction = new SignedTransaction(txObj, wallet);
    return await this.iconService.sendTransaction(signedTransaction).execute();
  }
}

module.exports = TestXcall;
