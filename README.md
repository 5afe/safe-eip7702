# safe-interoperable-delegated-account-poc
A POC for ERC-Interoperable Delegated Account

This repository showcases how EOA account can delegate to a Safe account. [ERC-7702](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7702.md) introduces a new transaction type 4 that allows EOA to set code and delegate to a contract.

[SafeERC7702.sol](./contracts/SafeERC7702.sol) is a custom proxy contract that can be setup as a delegate for an EOA account. A custom proxy is required because ERC-7702 does not allow executing initcode while giving authority to a contract. Having a custom proxy to enforce that account storage can only be initialized with pre-determined and approved initializer.

This proxy contract take hash of setup data in constructor which means that proxy address depends on the setup data. Thus, it is not possible to initialize storage of EOA with arbitrary data after the authorization transaction.

## Install

```bash
    pnpm i
```

## Test

```bash
    pnpm test
```

### Useful links

- [Pectra Faucet](https://faucet.pectra-devnet-3.ethpandaops.io/)