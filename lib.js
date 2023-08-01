// IMPORTS
require("dotenv").config();
const IconService = require("icon-sdk-js");
const { ethers } = require("ethers");
const { BigNumber } = ethers;
const Web3Utils = require("web3-utils");
const fs = require("fs");
const customRequest = require("./customRequest");
const config = require("./config");

// CONSTANTS
// CHANGE THESE VALUES TO YOUR OWN

const {
  ICON_WALLET_PK,
  EVM_WALLET_PK,
  ICON_XCALL_ADDRESS,
  ICON_DAPP_ADDRESS,
  EVM_XCALL_ADDRESS,
  EVM_DAPP_ADDRESS,
  EVM_CHAIN_LABEL,
  // ICON_CHAIN_LABEL,
  ICON_RPC_URL,
  EVM_RPC_URL,
  ICON_RPC_NID
} = config;

// SETTINGS
const {
  IconWallet,
  IconBuilder,
  SignedTransaction,
  IconConverter,
  HttpProvider
} = IconService.default;

const { CallTransactionBuilder, CallBuilder } = IconBuilder;
const ICON_HTTP_PROVIDER = new HttpProvider(ICON_RPC_URL);
const ICON_SERVICE = new IconService.default(ICON_HTTP_PROVIDER);
const EVM_PROVIDER = new ethers.providers.JsonRpcProvider(EVM_RPC_URL);
const EVM_SIGNER = new ethers.Wallet(EVM_WALLET_PK, EVM_PROVIDER);
const ICON_SIGNER = IconWallet.loadPrivateKey(ICON_WALLET_PK);

// EVM CHAIN FUNCTIONS
function getContractObjectEVM(abi, address) {
  try {
    console.log("getContractObjectEVM");
    // console.log(abi);
    // console.log(address);
    // console.log(EVM_SIGNER);
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

function getCustomEVMEvent(receipts, contract, eventName) {
  let event;
  const logs = filterEventEVM(
    contract,
    contract.filters[eventName](),
    receipts
  );
  if (logs.length > 0) {
    event = logs[0].args;
  } else {
    throw new Error(`${eventName} event not found`);
  }
  return event;
}

function checkCallExecuted(receipts, contract) {
  const event = getCustomEVMEvent(receipts, contract, "CallExecuted");
  return event;
}

function verifyReceivedMessage(receipts) {
  const contract = getDappContractEVM();
  const event = getCustomEVMEvent(receipts, contract, "MessageReceived");
  return event;
}

function getResponseMessageEventEVM(receipts, contract) {
  const event = getCustomEVMEvent(receipts, contract, "ResponseMessage");
  return event;
}

function getAllEvents(contract) {
  contract.on("CallMessage", (...params) => {
    console.log(JSON.stringify(params));
  });
}

async function waitEventEVM(contract, filterCM) {
  console.log("filterCM");
  console.log(filterCM);
  // getAllEvents(contract);
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
async function sendCallMessage(to, data, useRollback = false) {
  try {
    const wallet = ICON_SIGNER;
    const params = {
      _to: to,
      _data: data
    };

    if (useRollback) {
      // params["_rollback"] = encodeMessage("rollback message");
      params["_rollback"] = encodeMessage("revertMessage");
    }

    // get the fee for the transaction
    const fee = await getFee(EVM_CHAIN_LABEL, useRollback);

    const txObj = new CallTransactionBuilder()
      .from(wallet.getAddress())
      .to(ICON_DAPP_ADDRESS)
      .stepLimit(IconConverter.toBigNumber(2000000))
      .nid(IconConverter.toBigNumber(ICON_RPC_NID))
      .nonce(IconConverter.toBigNumber(1))
      .version(IconConverter.toBigNumber(3))
      .timestamp(new Date().getTime() * 1000)
      // .method("sendCallMessage")
      .method("sendMessage")
      .params(params)
      .value(fee)
      // .value("0x1a055690d9db80000")
      .build();

    const signedTransaction = new SignedTransaction(txObj, wallet);
    console.log("## signed transaction");
    console.log(signedTransaction.getRawTransaction());
    return await ICON_SERVICE.sendTransaction(signedTransaction).execute();
  } catch (e) {
    console.log("Error running sendCallMessage");
    throw new Error(e);
  }
}

async function getFee(_net, useRollback = false) {
  try {
    const params = {
      _net: _net,
      _rollback: useRollback ? "0x1" : "0x0"
    };

    const txObj = new CallBuilder()
      .to(ICON_XCALL_ADDRESS)
      .method("getFee")
      .params(params)
      .build();

    // console.log("# getFee tx object:");
    // console.log(txObj);
    return await ICON_SERVICE.call(txObj).execute();
  } catch (e) {
    console.log("Error running getFee");
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

async function getBlockICON(hashOrNumber) {
  if (hashOrNumber == null || hashOrNumber === "latest") {
    return await ICON_SERVICE.getLastBlock().execute();
  } else if (typeof hashOrNumber === "string") {
    await ICON_SERVICE.getBlockByHash(hashOrNumber).execute();
  } else {
    // const height = BigNumber.isBigNumber(hashOrNumber)
    //   ? hashOrNumber
    //   : new BigNumber.from(hashOrNumber);
    return await ICON_SERVICE.getBlockByHeight(hashOrNumber).execute();
  }
}

async function getTransactionsFromBlock(block) {
  const transactions = [];
  try {
    for (const tx of block.confirmedTransactionList) {
      const txResult = await getTxResultWaited(tx.txHash);
      transactions.push(txResult);
      if (txResult === null) {
        throw new Error("txResult is null");
      }
    }
  } catch (e) {
    console.log("error running getTransactionsFromBlock", e);
  }
  return transactions;
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

async function waitResponseMessageEvent(id, blocksToWait = 5) {
  const sig = "ResponseMessage(int,int,str)";
  const parseId = id.toHexString();
  return await waitEventICON(sig, ICON_XCALL_ADDRESS, parseId, blocksToWait);
}

async function waitRollbackMessageEvent(id, blocksToWait = 20) {
  const sig = "RollbackMessage(int)";
  const parseId = id.toHexString();
  return await waitEventICON(sig, ICON_XCALL_ADDRESS, parseId, blocksToWait);
}

async function waitRollbackExecutedEvent(id, blocksToWait = 20) {
  const sig = "RollbackExecuted(int,int,str)";
  const parseId = id.toHexString();
  return await waitEventICON(sig, ICON_XCALL_ADDRESS, parseId, blocksToWait);
}
async function waitEventICON(sig, address, id, blocksToWait = 5) {
  console.log(`## Waiting for event ${sig} on ${address} with id ${id}`);
  const maxBlocksToCheck = blocksToWait;
  let blocksChecked = 0;
  const latestBlock = await getBlockICON("latest");
  let blockNumber = latestBlock.height - 2;

  while (blocksChecked < maxBlocksToCheck) {
    blockNumber = blockNumber + 1;
    const latestBlock = await getBlockICON("latest");
    if (blockNumber > latestBlock.height) {
      await sleep(1000);
      blockNumber = blockNumber - 1;
      continue;
    }
    console.log(`## Fetching block ${blockNumber} for event`);
    const block = await getBlockICON(blockNumber);
    const txsInBlock = await getTransactionsFromBlock(block);
    for (const tx of txsInBlock) {
      const filteredEvents = filterEventICON(tx.eventLogs, sig, address);
      if (filteredEvents.length > 0) {
        for (const event of filteredEvents) {
          const idNumber = parseInt(id);
          const eventIdNumber = parseInt(event.indexed[1]);
          if (eventIdNumber == idNumber) {
            return event;
          }
        }
      }
      blocksChecked++;
    }
  }

  return null;
}

async function getTxResultWaited(txHash) {
  const maxLoops = 10;
  let loops = 0;
  while (loops < maxLoops) {
    try {
      const txResult = await ICON_SERVICE.getTransactionResult(
        txHash
      ).execute();
      return txResult;
    } catch (e) {
      console.log(`txResult (pass ${loops}):`, e);
      loops++;
    }
  }

  return null;
}

async function executeRollbackICON(id) {
  try {
    const wallet = ICON_SIGNER;
    const params = {
      _sn: id.toHexString()
    };

    const txObj = new CallTransactionBuilder()
      .from(wallet.getAddress())
      .to(ICON_XCALL_ADDRESS)
      .stepLimit(IconConverter.toBigNumber(2000000))
      .nid(IconConverter.toBigNumber(ICON_RPC_NID))
      .nonce(IconConverter.toBigNumber(1))
      .version(IconConverter.toBigNumber(3))
      .timestamp(new Date().getTime() * 1000)
      .method("executeRollback")
      .params(params)
      .build();

    const signedTransaction = new SignedTransaction(txObj, wallet);
    console.log("## executeRollback signed transaction");
    console.log(signedTransaction.getRawTransaction());
    return await ICON_SERVICE.sendTransaction(signedTransaction).execute();
  } catch (e) {
    console.log("Error running executeRollback");
    throw new Error(e);
  }
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

/*
 *
 */
function debugGetTrace(txHash) {
  const rpcObj = {
    jsonrpc: "2.0",
    method: "debug_getTrace",
    id: Math.ceil(Math.random() * 1000),
    params: {
      txHash: txHash
    }
  };
  return rpcObj;
}

/*
 *
 */
async function makeDebugTraceRequest(txHash, url = ICON_RPC_URL) {
  const rpcObj = debugGetTrace(txHash);
  const stringified = JSON.stringify(rpcObj);

  try {
    const query = await makeJsonRpcCall(stringified, url + "d", customRequest);
    return query;
  } catch (err) {
    console.log(err);
    return null;
  }
}

const urlRegex = /^((https|http):\/\/)?(([a-zA-Z0-9-]{1,}\.){1,}([a-zA-Z0-9]{1,63}))(:[0-9]{2,5})?(\/.*)?$/;

/*
 *
 */
function makeUrlObject(rpcNode) {
  const inputInLowercase = rpcNode.toLowerCase();
  const parsedUrl = {
    protocol: "https",
    path: "/",
    hostname: null,
    port: "443"
  };

  const regexResult = inputInLowercase.match(urlRegex);

  if (regexResult != null) {
    parsedUrl.protocol = regexResult[2] == null ? "https" : regexResult[2];
    parsedUrl.path = regexResult[7] == null ? "/" : regexResult[7];
    parsedUrl.hostname = regexResult[3] == null ? rpcNode : regexResult[3];
    parsedUrl.port = regexResult[6] == null ? "" : regexResult[6].slice(1);
  }

  return parsedUrl;
}

/*
 *
 */
function icxCall(contract, method, paramsObj = {}) {
  const rpcObj = {
    jsonrpc: "2.0",
    method: "icx_call",
    id: Math.ceil(Math.random() * 1000),
    params: {
      to: contract,
      dataType: "call",
      data: {
        method: method
      }
    }
  };
  if (Object.keys(paramsObj).length > 0) {
    rpcObj.params.data.params = { ...paramsObj };
  }

  return rpcObj;
}

/*
 *
 */
async function makeJsonRpcCall(data, url, queryMethod) {
  try {
    const urlObj = makeUrlObject(url);
    const path = urlObj.path === "/" ? "/api/v3" : urlObj.path;
    const query = await queryMethod(
      path,
      data,
      urlObj.hostname,
      urlObj.protocol == "http" ? false : true,
      urlObj.port == "" ? false : urlObj.port
    );

    if (query != null) {
      return query;
    } else {
      return {
        error: {
          code: -1,
          message: "Error trying to make request to chain"
        }
      };
    }
  } catch (err) {
    console.log("Error trying to make request to chain");
    console.log(err);
    return {
      error: {
        code: -1,
        message: "Error trying to make request to chain"
      }
    };
  }
}

/*
 *
 */
async function makeIcxCallRequest(url, contract, method, params = {}) {
  const rpcObj = icxCall(contract, method, params);
  const stringified = JSON.stringify(rpcObj);

  try {
    const query = await makeJsonRpcCall(stringified, url, customRequest);
    return query;
  } catch (err) {
    console.log(err);
    return null;
  }
}

function getScoreApi(contract = "cx0000000000000000000000000000000000000001") {
  const rpcObj = {
    jsonrpc: "2.0",
    method: "icx_getScoreApi",
    id: Math.ceil(Math.random() * 1000),
    params: {
      address: contract
    }
  };
  return rpcObj;
}

async function makeGetScoreApiRequest(url, contract) {
  const rpcObj = getScoreApi(contract);
  const stringified = JSON.stringify(rpcObj);

  try {
    const query = await makeJsonRpcCall(stringified, url, customRequest);
    return query;
  } catch (e) {
    console.log(e);
    return null;
  }
}

function getTxResultJSONRPC(txHash) {
  return {
    jsonrpc: "2.0",
    method: "icx_getTransactionResult",
    id: 121,
    params: {
      txHash: txHash
    }
  };
}

async function makeGetTxResultRequest(txHash, url) {
  const rpcObj = getTxResultJSONRPC(txHash);
  const stringified = JSON.stringify(rpcObj);
  try {
    const query = await makeJsonRpcCall(stringified, url, customRequest);
    return query;
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  decodeMessage,
  encodeMessage,
  sleep,
  getBtpAddress,
  filterEventICON,
  parseCallMessageSentEvent,
  getTransactionResultICON,
  getContractObjectEVM,
  getDappContractEVM,
  getXcallContractEVM,
  executeCall,
  sendSignedTxEVM,
  filterEventEVM,
  checkCallExecuted,
  verifyReceivedMessage,
  getResponseMessageEventEVM,
  waitEventEVM,
  sendCallMessage,
  getFee,
  makeDebugTraceRequest,
  makeGetScoreApiRequest,
  getBlockICON,
  getTransactionsFromBlock,
  waitEventICON,
  waitResponseMessageEvent,
  waitRollbackMessageEvent,
  executeRollbackICON,
  waitRollbackExecutedEvent
};
