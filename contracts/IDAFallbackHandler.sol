// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.27;

import {IInteroperableDelegatedAccount} from "./interfaces/IInteroperableDelegatedAccount.sol";
import {ClearSafeStorage} from "./ClearSafeStorage.sol";
import {CompatibilityFallbackHandler} from "@safe-global/safe-contracts/contracts/handler/CompatibilityFallbackHandler.sol";
import {HandlerContext} from "@safe-global/safe-contracts/contracts/handler/HandlerContext.sol";
import {ISafe} from "./interfaces/ISafe.sol";

contract IDAFallbackHandler is CompatibilityFallbackHandler, IInteroperableDelegatedAccount, ClearSafeStorage, HandlerContext {
    error InvalidSender(address sender, address expected);
    event OnRedelegation();

    function accountId() external view returns (string memory) {
        return "SafeSmartAccount.v1.4.1";
    }

    function accountStorageBases() external view returns (bytes32[] memory) {
        return new bytes32[](0);
    }

    function onRedelegation() external returns (bool) {
        if (_manager() != _msgSender()) {
            revert InvalidSender(_msgSender(), _manager());
        }

        bool success = ISafe(_manager()).execTransactionFromModule(
            address(this),
            0,
            abi.encode(this.clearSafeStorageDelegateCallReciever.selector),
            1
        );

        if (!success) {
            return false;
        }

        emit OnRedelegation();
        return true;
    }
}
