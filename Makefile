PWD = $(abspath ./)

GRADLE = ./gradlew

HARDHAT = npx hardhat
TS_NODE = npx ts-node
NETWORK_BSC = --network bscTestnet
NETWORK_ETH = --network hardhat2
SOLIDITY_CONTRACTS = ./solidity/contracts

.DEFAULT_GOAL := all
all:
	@echo $(PWD)

run:
	@ echo ">>> Run index.js with hardhat" ; \
	E2E_DEMO_PATH=$(PWD) \
	$(HARDHAT) $(NETWORK_ETH) run index.js
