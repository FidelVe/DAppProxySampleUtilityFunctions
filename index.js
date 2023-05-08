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
      hardhat: ""
    },
    nid: {
      icon: 3
    },
    wallet: {
      icon: {
        keystorePath: "./wallets/icon_keystore.json",
        password: process.env.PW2
      },
      hardhat: {
        address: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1"
      }
    },
    contract: {
      xcall: {
        icon: deployments.icon.contracts.xcall,
        hardhat: ""
      }
    },
    network: {
      icon: deployments.icon.network,
      hardhat: deployments.hardhat2.network
    }
  };
  const xcall = new TestXcall(props);
  // TEST 1: send message from icon to hardhat
  const btpDestination = xcall.getBtpAddress(
    props.network.hardhat,
    props.wallet.hardhat.address
  );
  console.log(btpDestination);
}

main();
