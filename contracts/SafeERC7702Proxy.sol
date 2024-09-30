// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.27;
import {SafeProxy} from "@safe-global/safe-contracts/contracts/proxies/SafeProxy.sol";

contract SafeERC7702Proxy is SafeProxy {
    bytes32 internal immutable SETUP_DATA_HASH;
    address internal immutable SINGLETON;
    constructor(bytes32 setupData, address singleton) SafeProxy(singleton) {
        SETUP_DATA_HASH = setupData;
        SINGLETON = singleton;
    }

    function setup(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external {
        require(keccak256(msg.data) == SETUP_DATA_HASH, "Invalid setup data");

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
