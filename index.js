// IMPORTS
require("dotenv").config();
const IconService = require("icon-sdk-js");
const config = require("./config");

const {
  decodeMessage,
  encodeMessage,
  getBtpAddress,
  filterEventICON,
  parseCallMessageSentEvent,
  getTransactionResultICON,
  getXcallContractEVM,
  executeCall,
  checkCallExecuted,
  verifyReceivedMessage,
  verifyResponseMessage,
  waitEventEVM,
  sendCallMessage,
  makeDebugTraceRequest,
  makeGetScoreApiRequest,
  getBlockICON,
  filterEventFromBlock,
  waitEventICON,
  waitResponseMessageEvent
} = require("./lib");

// CONSTANTS
// CHANGE THESE VALUES TO YOUR OWN IN THE config.js FILE

const {
  ICON_WALLET_PK,
  ICON_XCALL_ADDRESS,
  ICON_DAPP_ADDRESS,
  EVM_DAPP_ADDRESS,
  EVM_CHAIN_LABEL,
  ICON_CHAIN_LABEL,
  ICON_RPC_URL
} = config;

// SETTINGS
const { IconWallet } = IconService.default;

const ICON_SIGNER = IconWallet.loadPrivateKey(ICON_WALLET_PK);

// MAIN LOGIC

async function main(useRollback = false) {
  let debugTxHash;

  try {
    // get xcall score api on icon chain
    // const xcallAbiIcon = await makeGetScoreApiRequest(
    //   ICON_RPC_URL,
    //   ICON_DAPP_ADDRESS
    // );
    // console.log("\n## Xcall abi on icon chain:", xcallAbiIcon);
    // xcallAbiIcon.result.map(abi => {
    //   console.log("name:" + abi.name);
    //   console.log(abi.inputs);
    // });

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
      // ICON_SIGNER.getAddress()
      ICON_DAPP_ADDRESS
    );

    // send the call message to the evm chain
    const callMessageTxHash = await sendCallMessage(
      btpAddressDestination,
      dataToSend,
      useRollback
    );
    console.log("\n## Call message tx hash:", callMessageTxHash);

    // wait for the tx to be processed by the chain
    const callMessageTxResult = await getTransactionResultICON(
      callMessageTxHash
    );
    // console.log("\n## Call message tx result:", callMessageTxResult);
    debugTxHash = callMessageTxResult.txHash;

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
    console.log("## callMessageFilters:", callMessageFilters);
    console.log(btpAddressSource);
    console.log(EVM_DAPP_ADDRESS);
    console.log("\n ## Waiting for callMessage event on evm chain...");
    const events = await waitEventEVM(xcallEvmContract, callMessageFilters);
    const messageId = events[0].args._reqId;
    console.log("## events params:");
    console.log("_from:", events[0].args._from);
    console.log("_to:", events[0].args._to);
    console.log("_ReqId:", messageId);
    console.log("_sn:", events[0].args._sn);

    // invoke executeCall on destination chain
    console.log("\n ## Invoke executeCall on destination chain...");
    const executeCallTxHash = await executeCall(messageId);
    // console.log("executeCallTxHash:", executeCallTxHash);

    // check the CallExecuted event
    console.log("\n ## Waiting for CallExecuted event on evm chain...");
    const callExecutedEvent = await checkCallExecuted(
      executeCallTxHash,
      xcallEvmContract
    );
    console.log("## callExecutedEvent params:");
    console.log("_reqId: ", callExecutedEvent._reqId);
    console.log("_code: ", callExecutedEvent._code);
    console.log("_msg: ", callExecutedEvent._msg);

    // verify the received message
    console.log("\n ## verifying the received message on evm chain...");
    const verifyReceivedEvent = await verifyReceivedMessage(executeCallTxHash);
    console.log(verifyReceivedEvent);

    // decode the received message
    console.log("\n ## decode received message");
    const decodedMessage = decodeMessage(verifyReceivedEvent._data);
    console.log("decodedMessage:", decodedMessage);

    if (useRollback) {
      console.log("\n ## rollback option not null...");
      // for scenarios where use rollback is not null we execute
      // the following logic
      // check for ResponseMessage event on source chain
      const responseMessageEvent = await waitResponseMessageEvent(messageId);
      if (responseMessageEvent == null) {
        throw new Error("Failed to get ResponseMessage event");
      }
      console.log("## responseMessageEvent:");
      console.log(responseMessageEvent);
    }
  } catch (e) {
    console.log("error running main function:", e);
    const debug = await makeDebugTraceRequest(debugTxHash);
    console.log("debug trace");
    console.log(debug);
    debug.result.logs.map(log => {
      console.log("\n");
      console.log(log);
    });
  }
}

main(true);
