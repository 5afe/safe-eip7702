// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.27;

import {IInteroperableDelegatedAccount} from "./interfaces/IInteroperableDelegatedAccount.sol";

contract FallbackHandler is IInteroperableDelegatedAccount {
    function accountId() external view returns (string memory) {
        return "";
    }

    function accountStorageBases() external view returns (bytes32[] memory) {
        return new bytes32[](0);
    }

    function onRedelegation() external returns (bool) {
        return true;
    }
}
