// IMPORTS
require("dotenv").config();
const IconService = require("icon-sdk-js");
const { ethers } = require("ethers");
const { BigNumber } = ethers;
const Web3Utils = require("web3-utils");
const fs = require("fs");

// CONSTANTS
// CHANGE THESE VALUES TO YOUR OWN

const ICON_WALLET_PK =
  "573b555367d6734ea0fecd0653ba02659fa19f7dc6ee5b93ec781350bda27376";
const EVM_WALLET_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ICON_XCALL_ADDRESS = "cx17cb94775d2f774277bfbf3477be5f36ca5af37f";
const EVM_XCALL_ADDRESS = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
const EVM_DAPP_ADDRESS = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
const EVM_CHAIN_LABEL = "0x539.hardhat";
const ICON_CHAIN_LABEL = "0x3.icon";

// SETTINGS
const {
  IconWallet,
  IconBuilder,
  SignedTransaction,
  IconConverter,
  HttpProvider
} = IconService.default;

const { CallTransactionBuilder } = IconBuilder;

const ICON_RPC_URL = process.env.ICON_RPC || "http://localhost:9080/api/v3";
const ICON_RPC_NID = 3;
const EVM_RPC_URL = process.env.EVM_RPC || "http://localhost:8545";

const ICON_HTTP_PROVIDER = new HttpProvider(ICON_RPC_URL);
const ICON_SERVICE = new IconService.default(ICON_HTTP_PROVIDER);
const EVM_PROVIDER = new ethers.providers.JsonRpcProvider(EVM_RPC_URL);
const EVM_SIGNER = new ethers.Wallet(EVM_WALLET_PK, EVM_PROVIDER);
const ICON_SIGNER = IconWallet.loadPrivateKey(ICON_WALLET_PK);

// EVM CHAIN FUNCTIONS
function getContractObjectEVM(abi, address) {
  try {
    const contractObject = new ethers.Contract(address, abi, EVM_SIGNER);
    return contractObject;
  } catch (e) {
    console.log(e);
  }
}

function getDappContractEVM() {
  try {
    const DAPP_ABI = JSON.parse(fs.readFileSync("./dappAbi.json", "utf8"));
    return getContractObjectEVM(DAPP_ABI.abi, EVM_DAPP_ADDRESS);
  } catch (e) {
    console.log(e);
  }
}

function getXcallContractEVM() {
  try {
    const XCALL_ABI = JSON.parse(fs.readFileSync("./xcallAbi.json", "utf8"));
    return getContractObjectEVM(XCALL_ABI.abi, EVM_XCALL_ADDRESS);
  } catch (e) {
    console.log(e);
  }
}

async function executeCall(reqId) {
  try {
    const contract = getXcallContractEVM();
    return await sendSignedTxEVM(contract, "executeCall", reqId);
  } catch (e) {
    console.log("error running executeCall");
    console.log(e);
  }
}

async function sendSignedTxEVM(contractObject, method, ...methodParams) {
  const txParams = { gasLimit: 15000000 };
  const tx = await contractObject[method](...methodParams, txParams);
  const receipt = await tx.wait(1);
  return receipt;
}

function filterEventEVM(contract, filter, receipt) {
  const inf = contract.interface;
  const address = contract.address;
  const topics = filter.topics || [];
  if (receipt.events && typeof topics[0] === "string") {
    const fragment = inf.getEvent(topics[0]);
    return receipt.events
      .filter(event => {
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
      .map(event => {
        return {
          args: inf.decodeEventLog(fragment, event.data, event.topics)
        };
      });
  }
  return [];
}

async function checkCallExecuted(receipts, contract) {
  let event;
  const logs = filterEventEVM(
    contract,
    contract.filters.CallExecuted(),
    receipts
  );
  if (logs.length > 0) {
    event = logs[0].args;
  }
  return event;
}

function verifyReceivedMessage(receipts) {
  const contract = getDappContractEVM();
  let event;
  const logs = filterEventEVM(
    contract,
    contract.filters.MessageReceived(),
    receipts
  );
  if (logs.length > 0) {
    event = logs[0].args;
  }
  return event;
}

async function waitEventEVM(contract, filterCM) {
  let height = await contract.provider.getBlockNumber();
  let next = height + 1;
  while (true) {
    if (height == next) {
      await sleep(1000);
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

// ICON CHAIN FUNCTIONS
async function sendCallMessage(to, data) {
  try {
    const wallet = ICON_SIGNER;

    const txObj = new CallTransactionBuilder()
      .from(wallet.getAddress())
      .to(ICON_XCALL_ADDRESS)
      .stepLimit(IconConverter.toBigNumber(2000000))
      .nid(IconConverter.toBigNumber(ICON_RPC_NID))
      .nonce(IconConverter.toBigNumber(1))
      .version(IconConverter.toBigNumber(3))
      .timestamp(new Date().getTime() * 1000)
      .method("sendCallMessage")
      .params({
        _to: to,
        _data: data
      })
      .build();

    console.log("# sendCallMessage tx object:");
    console.log(txObj);
    const signedTransaction = new SignedTransaction(txObj, wallet);
    return await ICON_SERVICE.sendTransaction(signedTransaction).execute();
  } catch (e) {
    console.log("Error running sendCallMessage");
    throw new Error(e);
  }
}

async function getTransactionResultICON(txHash) {
  for (let i = 0; i < 10; i++) {
    try {
      const txResult = await ICON_SERVICE.getTransactionResult(
        txHash
      ).execute();
      return txResult;
    } catch (e) {
      console.log(`txResult (pass ${i}):`, e);
    }
    await sleep(1000);
  }
}

function parseCallMessageSentEvent(event) {
  const indexed = event[0].indexed || [];
  const data = event[0].data || [];
  return {
    _from: indexed[1],
    _to: indexed[2],
    _sn: BigNumber.from(indexed[3]),
    _nsn: BigNumber.from(data[0])
  };
}

function filterEventICON(eventlogs, sig, address) {
  return eventlogs.filter(event => {
    return (
      event.indexed &&
      event.indexed[0] === sig &&
      (!address || address === event.scoreAddress)
    );
  });
}

// UTILITY FUNCTIONS
function getBtpAddress(network, address) {
  return `btp://${network}/${address}`;
}

async function sleep(time) {
  await new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

function encodeMessage(msg) {
  const encoded = Web3Utils.fromUtf8(msg);
  return encoded;
}

function decodeMessage(msg) {
  const decoded = Web3Utils.hexToString(msg);
  return decoded;
}

// MAIN LOGIC

async function main() {
  try {
    // Encode the message to send
    const dataToSend = encodeMessage("Hello from ICON");
    console.log("\n## Encoded message:", dataToSend);

    // Get the dapp contract btp address on the evm chain
    const btpAddressDestination = getBtpAddress(
      EVM_CHAIN_LABEL,
      EVM_DAPP_ADDRESS
    );
    const btpAddressSource = getBtpAddress(
      ICON_CHAIN_LABEL,
      ICON_SIGNER.getAddress()
    );

    // send the call message to the evm chain
    const callMessageTxHash = await sendCallMessage(
      btpAddressDestination,
      dataToSend
    );
    console.log("\n## Call message tx hash:", callMessageTxHash);

    // wait for the tx to be processed by the chain
    const callMessageTxResult = await getTransactionResultICON(
      callMessageTxHash
    );
    console.log("\n## Call message tx result:", callMessageTxResult);

    // Filter transaction events on ICON chain
    const callMesageEventLogs = filterEventICON(
      callMessageTxResult.eventLogs,
      "CallMessageSent(Address,str,int,int)",
      ICON_XCALL_ADDRESS
    );
    console.log("\n## Call message event logs:", callMesageEventLogs);

    // Get the call message sent event
    const parsedCallMessageSentEvent = parseCallMessageSentEvent(
      callMesageEventLogs
    );
    console.log(
      "\n## Parsed call message sent event:",
      parsedCallMessageSentEvent
    );

    // get xcall contract object for evm chain
    const xcallEvmContract = getXcallContractEVM();
    // console.log("xcall contract on evm chain:", xcallEvmContract);

    // get callMessageSent event on evm chain
    const callMessageFilters = xcallEvmContract.filters.CallMessage(
      btpAddressSource,
      EVM_DAPP_ADDRESS
    );
    console.log("callMessageFilters:", callMessageFilters);

    console.log("\n ## Waiting for callMessage event on evm chain...");
    const events = await waitEventEVM(xcallEvmContract, callMessageFilters);
    console.log("events:", events);
    console.log("# ReqId:", events[0].args._reqId);

    // invoke executeCall on destination chain
    console.log("\n ## Invoke executeCall on destination chain...");
    const executeCallTxHash = await executeCall(events[0].args._reqId);
    console.log("executeCallTxHash:", executeCallTxHash);

    // check the CallExecuted event
    console.log("\n ## Waiting for CallExecuted event on evm chain...");
    const callExecutedEvent = await checkCallExecuted(
      executeCallTxHash,
      xcallEvmContract
    );
    console.log("callExecutedEvent:", callExecutedEvent);

    // verify the received message
    console.log("\n ## verifying the received message on evm chain...");
    const verifyReceivedEvent = await verifyReceivedMessage(executeCallTxHash);
    console.log(verifyReceivedEvent);

    // decode the received message
    console.log("\n ## decode received message");
    const decodedMessage = decodeMessage(verifyReceivedEvent._data);
    console.log("decodedMessage:", decodedMessage);
  } catch (e) {
    console.log("error running main function:", e);
  }
}

main();
