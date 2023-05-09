require("dotenv").config();
const fs = require("fs");
const TestXcall = require("./lib");

function getDeployments() {
  const f = fs.readFileSync("./deployments.json", "utf8");
  return JSON.parse(f);
}

async function main() {
  //
  const deployments = getDeployments();
  const props = {
    rpc: {
      icon: "https://server02.espanicon.team/api/v3",
      hardhat: "",
    },
    nid: {
      icon: 3,
    },
    wallet: {
      icon: {
        keystorePath: "./wallets/icon_keystore.json",
        password: process.env.PW2,
      },
      hardhat: {
        address: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
      },
    },
    contract: {
      xcall: {
        icon: deployments.icon.contracts.xcall,
        hardhat: deployments.hardhat2.contracts.xcall,
      },
      dapp: {
        icon: "",
        hardhat: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
      },
    },
    network: {
      icon: deployments.icon.network,
      hardhat: deployments.hardhat2.network,
    },
  };
  const xcall = new TestXcall(props);
  // TEST 1: send message from icon to hardhat
  const btpDestination = xcall.getBtpAddress(
    props.network.hardhat,
    props.contract.dapp.hardhat
  );

  const btpSource = xcall.getBtpAddress(
    props.network.icon,
    xcall.iconWallet.getAddress()
  );

  console.log("\n## btp destination");
  console.log(btpDestination);

  console.log("\n## Send message from icon to hardhat");
  const callMessageTxHash = await xcall.sendCallMessage(
    btpDestination,
    "0x1234"
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
  console.log("\n## filter event. Get CallMessageSent event");
  console.log(a);

  // TEST 2: hardhat
  console.log("\n## get xcall contract from hardhat");
  const xcallContract = await xcall.getCallServiceContract();
  console.log(xcallContract.address);

  console.log("\n## get CallMessageSent event");
  const filterCM = xcallContract.filters.CallMessage(
    btpSource,
    props.contract.dapp.hardhat
  );
  console.log("filterCM logs");
  console.log(filterCM);

  const events = await xcall.waitEventEvmChain(xcallContract, filterCM);
  console.log("events");
  console.log(events);
}

main();
