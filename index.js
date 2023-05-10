const TestXcall = require("./lib");

async function main() {
  //

  const xcall = new TestXcall();
  // TEST 1: send message from icon to hardhat
  const btpDestination = xcall.getBtpAddress(
    xcall.network.hardhat,
    xcall.contracts.dapp.hardhat
  );

  const dataToSend = "Hello this is xCall live!";
  console.log("\n## Message to send using xCall: ", dataToSend);
  const encoded = xcall.encodeMessage(dataToSend);

  const btpSource = xcall.getBtpAddress(
    xcall.network.icon,
    xcall.iconWallet.getAddress()
  );

  console.log("\n## btp destination");
  console.log(btpDestination);

  console.log("\n## Send message from icon to hardhat");
  const callMessageTxHash = await xcall.sendCallMessage(
    btpDestination,
    encoded
  );
  console.log("# Send message result txHash: ", callMessageTxHash);

  console.log("\n## Get transaction result");
  const callMessageTxResult = await xcall.getTransactionResult(
    callMessageTxHash
  );
  const a = xcall.filterEventIconChain(
    callMessageTxResult.eventLogs,
    "CallMessageSent(Address,str,int,int)",
    "cx17cb94775d2f774277bfbf3477be5f36ca5af37f"
  );
  const parsedA = xcall.getCallMessageSentEvent(a);
  console.log("\n## filter event. Get CallMessageSent event on ICON chain");
  console.log(parsedA);

  // TEST 2: hardhat
  console.log("\n## get xcall contract from hardhat");
  const xcallContract = await xcall.getCallServiceContract();
  console.log(xcallContract.address);

  console.log("\n## get CallMessage event on evm chain");
  const filterCM = xcallContract.filters.CallMessage(
    btpSource,
    xcall.contracts.dapp.hardhat
  );
  console.log("# filterCM logs");
  console.log(filterCM);

  const events = await xcall.waitEventEvmChain(xcallContract, filterCM);
  console.log("# events");
  console.log(events);

  console.log("# reqId");
  const reqId = events[0].args._reqId;
  console.log(reqId);

  console.log("\n## Invoke executeCall on destination chain");
  const executeCallTxHash = await xcall.executeCall(reqId);
  console.log(executeCallTxHash);

  console.log("\n## Check callExecuted event on hardhat chain");
  const filterCE = xcallContract.filters.CallExecuted();
  console.log("# filterCE logs");
  console.log(filterCE);

  const callExecutedEvent = await xcall.checkCallExecuted(
    executeCallTxHash,
    xcallContract
  );
  console.log("# callExecutedEvent");
  console.log(callExecutedEvent);

  console.log(
    "\n## Check that reqId from CallMessage Event is the same reqId from CallExecuted Event"
  );
  console.log(`## reqId from CallMessage Event: ${reqId}`);
  console.log(`## reqId from CallExecuted Event: ${callExecutedEvent._reqId}`);

  console.log("\n## Verify received message on proxy DApp");
  const verifyReceivedEvent = await xcall.verifyReceivedMessage(
    executeCallTxHash
  );
  console.log("# verifyReceivedEvent");
  console.log(verifyReceivedEvent);

  const decodedMsg = xcall.decodeMessage(verifyReceivedEvent._data);
  console.log("\n## Decoded message sent via xcall");
  console.log(decodedMsg);
}

main();
