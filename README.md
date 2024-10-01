# safe-interoperable-delegated-account-poc
A POC for ERC-Interoperable Delegated Account

This repository showcases how EOA account can delegate to a Safe account. [ERC-7702](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7702.md) introduces a new transaction type 4 that allows EOA to set code and delegate to a contract.
- [SafeERC7702.sol](./contracts/SafeERC7702.sol) is a custom proxy contract that can be set up as a delegate for an EOA account. A custom proxy is required because with ERC-7702 it is not possible to execute initcode while giving authority to a contract. Having a custom proxy ensures that account storage can only be initialized with a pre-determined and approved initializer.


This proxy contract takes the hash of the setup data in the constructor, which means that the proxy address depends on the setup data. Thus, it is not possible to initialize the storage of an EOA with arbitrary data after the authorization transaction.

- [SafeERC7702ProxyFactory.sol](./contracts/SafeERC7702ProxyFactory.sol) is a factory contract that can be used to deploy the SafeERC7702 proxy contract.

- [IDAFallbackHandler.sol](./contracts/IDAFallbackHandler.sol) is used as a fallback handler and module when an account has been delegated to a Safe proxy.

- [ClearAccountStorage.sol](./contracts/ClearSafeStorage.sol)

An EOA account can delegate to this contract to clear account storage associated with a Safe contract. This contract can also be used to clear storage at specific slots using the `clearStorageSlots(bytes32[])` function. This function is useful when it is not possible to know which storage slots need to be cleared on-chain, e.g., mappings.

Using this contract, the following storage slots associated with Safe can be cleared: 
- clear slot 7 - `mapping(bytes32 => uint256) internal signedMessages;`
- clear slot 8 - `mapping(address => mapping(bytes32 => uint256)) internal approvedHashes;`

__Note:__ This contract does not implement any verification logic.

## Install

```bash
    pnpm i
```

## Test

```bash
    npx hardhat test --deploy-fixture --network pectra
```

### Useful links

- [Pectra Faucet](https://faucet.pectra-devnet-3.ethpandaops.io/)