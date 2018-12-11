const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const pify = require("pify");
const PORT = 8545;
const HOST = "127.0.0.1";
const HTTPADDRESS = `http://${HOST}:${PORT}`;

const testHttp = function(web3) {
  let web3send;
  let accounts;

  before("get personal accounts", async function() {
    accounts = await web3.eth.getAccounts();
  });

  before("setup provider send fn", function() {
    web3send = getSend(web3.currentProvider);
  });

  describe("subscriptions", function() {
    it("should gracefully handle http subscription attempts", async function() {
      // Attempt to subscribe http connection to 'pendingTransactions'
      const { error } = await web3send("eth_subscribe", "pendingTransactions");
      assert(error, "http subscription should respond with an error");
      assert.strictEqual(error.code, -32000, "Error code should equal -32000");
      assert.strictEqual(error.message, "notifications not supported", "notifications should not be supported");

      // Issue a sendTransaction - ganache should not attempt to issue a message to http subscriptions
      const { result } = await web3send("eth_sendTransaction", { from: accounts[0], value: "0x1" });
      // Get receipt -- ensure ganache is still running/accepting calls
      let receipt = await web3send("eth_getTransactionReceipt", result);
      // Receipt indicates that ganache has NOT crashed and continues to handle RPC requests
      assert(!receipt.error, "Should not respond with an error.");
      assert(receipt.result, "Should respond with a receipt.");
    });
  });
};

describe("HTTP Server should not handle subscriptions:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server({
      seed: "1337"
    });

    await pify(server.listen)(PORT);
    web3.setProvider(new Web3.providers.HttpProvider(HTTPADDRESS));
  });

  after("Shutdown server", async function() {
    await pify(server.close)();
  });

  testHttp(web3);
});

const getSend = (provider) => (method = "", ...params) => {
  return pify(provider.send.bind(provider))({
    id: `${new Date().getTime()}`,
    jsonrpc: "2.0",
    method,
    params: [...params]
  });
};
