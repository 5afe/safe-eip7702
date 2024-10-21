// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.27;
import {SafeProxy} from "@safe-global/safe-smart-account/contracts/proxies/SafeProxy.sol";

contract SafeEIP7702Proxy is SafeProxy {
    bytes32 internal immutable SETUP_DATA_HASH;
    address internal immutable SINGLETON;

    error InvalidSetupData(bytes32 expectedHash, bytes32 receivedHash);

    constructor(bytes32 setupDataHash, address singleton) SafeProxy(singleton) {
        SETUP_DATA_HASH = setupDataHash;
        SINGLETON = singleton;

        // Make proxy unusable
        /**
         * By setting the threshold it is not possible to call setup anymore,
         * so we create a Safe with 0 owners and threshold 1.
         * This is an unusable Safe Proxy
         */
        /* solhint-disable no-inline-assembly */
        /// @solidity memory-safe-assembly
        assembly {
            sstore(4, 1)
        }
        // /* solhint-enable no-inline-assembly */
    }

    function setup(
        address[] calldata /*_owners*/,
        uint256 /*_threshold*/,
        address /*to*/,
        bytes calldata /*data*/,
        address /*fallbackHandler*/,
        address /*paymentToken*/,
        uint256 /*payment*/,
        address payable /*paymentReceiver*/
    ) external {
        bytes32 hash = keccak256(msg.data);
        require(hash == SETUP_DATA_HASH, InvalidSetupData(SETUP_DATA_HASH, hash));

        singleton = SINGLETON;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let _singleton := and(sload(0), 0xffffffffffffffffffffffffffffffffffffffff)
            calldatacopy(0, 0, calldatasize())
            let success := delegatecall(gas(), _singleton, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            if eq(success, 0) {
                revert(0, returndatasize())
            }
            return(0, returndatasize())
        }
    }
}
