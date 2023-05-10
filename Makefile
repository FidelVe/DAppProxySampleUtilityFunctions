PWD = $(abspath ./)

GRADLE = ./gradlew

HARDHAT = npx hardhat
NETWORK_LOCAL = --network localhost
NETWORK_HARDHAT = --network hardhat2
SOLIDITY_CONTRACTS = ./solidity/contracts

run-remote:
	@ echo $(PWD)
	@ echo ">>> Run index.js with hardhat" ; \
	E2E_DEMO_PATH=$(PWD) \
	$(HARDHAT) $(NETWORK_HARDHAT) run index.js

run-local:
	@ echo $(PWD)
	@ echo ">>> Run index.js with hardhat" ; \
	E2E_DEMO_PATH=$(PWD) \
	$(HARDHAT) $(NETWORK_LOCAL) run index.js
