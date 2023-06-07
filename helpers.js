// helpers.js
//

const customRequest = require("./customRequest");

const urlRegex = /^((https|http):\/\/)?(([a-zA-Z0-9-]{1,}\.){1,}([a-zA-Z0-9]{1,63}))(:[0-9]{2,5})?(\/.*)?$/;

const typesOfProposals = [
  "text",
  "revision",
  "maliciousScore",
  "prepDisqualification",
  "stepPrice",
  "stepCosts",
  "rewardFund",
  "rewardFundsAllocation",
  "networkScoreDesignation",
  "networkScoreUpdate",
  "accumulatedValidationFailureSlashingRate",
  "missedNetworkProposalVoteSlashingRate",
  "call"
];

const proposalTypesData = {
  text: {
    name: "text",
    value: {
      text: "text proposals example"
    }
  },
  revision: {
    name: "revision",
    value: {
      revision: "0x11"
    }
  },
  maliciousScore: {
    name: "maliciousScore",
    value: {
      address: "cx7cc546bf908018b5602b66fa65ff5fdacef45fe0",
      type: "0x0"
    }
  },
  prepDisqualification: {
    name: "prepDisqualification",
    value: {
      address: "hx7cc546bf908018b5602b66fa65ff5fdacef45fe0"
    }
  },
  stepPrice: {
    name: "stepPrice",
    value: {
      stepPrice: "0x2e90edd00"
    }
  },
  stepCosts: {
    name: "stepCosts",
    value: {
      costs: {
        schema: "0x1",
        default: "0x2",
        contractCall: "0x3",
        contractCreate: "0x4",
        contractUpdate: "0x5",
        contractSet: "0x6",
        get: "0x7",
        getBase: "0x8",
        set: "0x9",
        setBase: "0x10",
        delete: "0x11",
        deleteBase: "0x12",
        input: "0x13",
        log: "0x14",
        logBase: "0x15",
        apiCall: "0x16"
      }
    }
  },
  rewardFund: {
    name: "rewardFund",
    value: {
      iglobal: "0x27b4"
    }
  },
  rewardFundsAllocation: {
    name: "rewardFundsAllocation",
    value: {
      iprep: "0x10",
      icps: "0xa",
      irelay: "0xa",
      ivoter: "0xb"
    }
  },
  networkScoreDesignation: {
    name: "networkScoreDesignation",
    value: {
      networkScores: [
        {
          role: "cps", // cps | relay
          address: "cx7cc546bf908018b5602b66fa65ff5fdacef45fe0"
        }
      ]
    }
  },
  networkScoreUpdate: {
    name: "networkScoreUpdate",
    value: {
      address: "cx7cc546bf908018b5602b66fa65ff5fdacef45fe0",
      content:
        "0x504b0304107082bc2bf352a000000280...00000504b03041400080808000000210000000",
      params: ["0x10", "Hello"]
    }
  },
  accumulatedValidationFailureSlashinrRate: {
    name: "accumulatedValidationFailureSlashingRate",
    value: {
      slashingRate: "0x5" // [0 ~ 100]
    }
  },
  missedNetworkProposalVoteSlashingRate: {
    name: "missedNetworkProposalVoteSlashingRate",
    value: {
      slashingRate: "0x5"
    }
  },
  call: {
    name: "call",
    value: {
      to: "cx0000000000000000000000000000000000000000",
      method: "someMethod",
      params: [
        {
          type: "str",
          value: "Alice"
        },
        {
          type: "struct",
          value: {
            nickName: "Bob",
            address: "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd"
          },
          fields: {
            nickName: "str",
            address: "address"
          }
        }
      ]
    }
  }
};
/*
 *
 */
function hexToDecimal(hex) {
  return parseInt(hex, 16);
}

/*
 *
 */
function decimalToHex(number) {
  return "0x" + number.toString(16);
}

/*
 *
 */
function fromHexInLoop(loopInHex) {
  let loopInBase2 = hexToDecimal(loopInHex);
  return loopInBase2 / 10 ** 18;
}

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

async function getProposals(url) {
  const rpcObj = {
    jsonrpc: "2.0",
    method: "icx_call",
    id: Math.ceil(Math.random() * 1000),
    params: {
      to: "cx0000000000000000000000000000000000000001",
      dataType: "call",
      data: {
        method: "getProposals"
        // params: {
        //   type: "0x1",
        //   status: "0x0"
        // }
      }
    }
  };

  const stringified = JSON.stringify(rpcObj);

  try {
    const query = await makeJsonRpcCall(stringified, url, customRequest);
    return query;
  } catch (e) {
    console.log(e);
    return null;
  }
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

async function makeGetScoreApiRequest(url) {
  const rpcObj = getScoreApi();
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

const helpers = {
  hexToDecimal,
  decimalToHex,
  fromHexInLoop,
  makeIcxCallRequest,
  getProposals,
  makeGetScoreApiRequest,
  makeGetTxResultRequest,
  typesOfProposals,
  proposalTypesData
};

module.exports = helpers;
