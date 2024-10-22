// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.27;

import {SafeStorage} from "@safe-global/safe-smart-account/contracts/libraries/SafeStorage.sol";
import {ISafe} from "@safe-global/safe-smart-account/contracts/interfaces/ISafe.sol";
import {Enum} from "@safe-global/safe-smart-account/contracts/libraries/Enum.sol";

contract ClearSafeStorage is SafeStorage {
    address internal immutable SELF;
    address internal constant SENTINEL_ADDRESS = address(0x1);
    bytes32 internal constant FALLBACK_HANDLER_STORAGE_SLOT = 0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5;
    bytes32 internal constant GUARD_STORAGE_SLOT = 0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8;

    event AccountStorageCleared(address indexed account);

    constructor() {
        SELF = address(this);
    }

    /**
     * @notice Modifier to make a function callable via delegatecall only.
     * If the function is called via a regular call, it will revert.
     */
    modifier onlyDelegateCall() {
        require(address(this) != SELF, "clearSafeStorageDelegateCallReciever should only be called via delegatecall");
        _;
    }

    function _clearStorage() internal {
        address safe = msg.sender;
        ISafe(safe).execTransactionFromModule(
            address(this),
            0,
            abi.encode(this.clearSafeStorageDelegateCallReciever.selector),
            Enum.Operation.DelegateCall
        );
    }

    function _removeAllOwners() internal {
        address owner = owners[SENTINEL_ADDRESS];
        if (owner == address(0)) return;

        address prevOwner = SENTINEL_ADDRESS;

        while (owner != SENTINEL_ADDRESS) {
            prevOwner = owner;
            address temp = owners[owner];
            owners[owner] = address(0);
            owner = temp;
        }
        owners[SENTINEL_ADDRESS] = address(0);
    }

    function _removeAllModules() internal {
        address module = modules[SENTINEL_ADDRESS];
        if (module == address(0)) return;

        address prevModule = SENTINEL_ADDRESS;

        while (module != SENTINEL_ADDRESS) {
            prevModule = module;
            address temp = modules[module];
            modules[module] = address(0);
            module = temp;
        }
        modules[SENTINEL_ADDRESS] = address(0);
    }

    function _clearSafeStorage() internal {
        // slot 0
        singleton = address(0);
        // slot 1
        _removeAllModules();
        // clears slot 2 owners mapping
        _removeAllOwners();
        // slot 3 - Owner count
        ownerCount = 0;
        // slot 4 - threshold
        threshold = 0;
        // slot 5 - nonce
        nonce = 0;
        // slot 6 - _deprecatedDomainSeparator
        /* solhint-disable no-inline-assembly */
        /// @solidity memory-safe-assembly
        assembly {
            sstore(6, 0)
        }
        /* solhint-enable no-inline-assembly */
        // TODO: clear slot 7 - mapping(bytes32 => uint256) internal signedMessages;
        // TODO: clear slot 8 - mapping(address => mapping(bytes32 => uint256)) internal approvedHashes;

        /* solhint-disable no-inline-assembly */
        /// @solidity memory-safe-assembly
        assembly {
            sstore(FALLBACK_HANDLER_STORAGE_SLOT, 0)
        }
        /* solhint-enable no-inline-assembly */

        /* solhint-disable no-inline-assembly */
        /// @solidity memory-safe-assembly
        assembly {
            sstore(GUARD_STORAGE_SLOT, 0)
        }
        /* solhint-enable no-inline-assembly */

        emit AccountStorageCleared(address(this));
    }

    function clearSafeStorageDelegateCallReciever() external onlyDelegateCall {
        _clearSafeStorage();
    }
}
