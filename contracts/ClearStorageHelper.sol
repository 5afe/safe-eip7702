// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.27;

import {ClearSafeStorage} from "./ClearSafeStorage.sol";

contract ClearStorageHelper is ClearSafeStorage {
    function clearSafeStorage() external {
        _clearSafeStorage();
    }

    function clearStorageSlots(bytes32[] memory slots) external {
        // TODO: Validate signature
        for (uint256 i = 0; i < slots.length; i++) {
            bytes32 slot = slots[i];
            /* solhint-disable no-inline-assembly */
            /// @solidity memory-safe-assembly
            assembly {
                sstore(slot, 0)
            }
            /* solhint-enable no-inline-assembly */
        }
    }
}
