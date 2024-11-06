// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.26;

import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/**
 * @title SafeLite - A lite version of Safe with multi-send functionality. The contract uses only storage slot 0 to track nonce.
 *                   The contract is intended to be used with EIP-7702 where EOA delegates to this contract.
 */
contract SafeLite {
    struct Storage {
        uint256 nonce;
    }

    // keccak256("SafeLite") & (~0xff)
    bytes32 private constant _STORAGE = 0xf391af0813284e31898752ae6d86b2fba2f5b7957123c9689e204dd75b30e800;
    // keccak256("EIP712Domain(uint256 chainId,address verifyingContract)");
    bytes32 private constant _DOMAIN_TYPEHASH = 0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218;
    // keccak256("MultiSend(bytes32 data,uint256 nonce)")
    bytes32 private constant _MULTISEND_TYPEHASH = 0x4b62daad5ffa0b659a63c2970c5ece817f1135bfe9848c40eedd738724987890;

    address private immutable ENTRY_POINT;

    error InvalidSignature();
    error UnsupportedEntryPoint();

    constructor(address entryPoint) {
        ENTRY_POINT = entryPoint;
    }

    /**
     * @notice Validates the call is initiated by the entry point.
     */
    modifier onlySupportedEntryPoint() {
        if (msg.sender != ENTRY_POINT) {
            revert UnsupportedEntryPoint();
        }
        _;
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlySupportedEntryPoint returns (uint256 validationData) {
        (uint256 r, uint256 vs) = abi.decode(userOp.signature, (uint256, uint256));
        bool ok = _isValidSignature(userOpHash, r, vs);

        assembly ("memory-safe") {
            validationData := add(not(ok), 2) // branchless madnesss, good thing this isn't production code!
            if missingAccountFunds {
                pop(call(gas(), caller(), missingAccountFunds, 0, 0, 0, 0))
            }
        }
    }

    /**
     * @dev Sends multiple transactions with signature validation and reverts all if one fails.
     * @param transactions Encoded transactions.
     * @param r The r part of the signature.
     * @param vs The v and s part of the signature.
     */
    function multiSend(bytes memory transactions, uint256 r, uint256 vs) public payable {
        Storage storage $ = _storage();
        uint256 nonce = $.nonce;

        // Calculate the hash of transactions data and nonce for signature verification
        bytes32 domainSeparator = keccak256(abi.encode(_DOMAIN_TYPEHASH, block.chainid, address(this)));
        bytes32 structHash = keccak256(abi.encode(_MULTISEND_TYPEHASH, keccak256(transactions), nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        // Verify the signature
        require(_isValidSignature(digest, r, vs), InvalidSignature());

        // Update nonce for the sender to prevent replay attacks
        unchecked {
            $.nonce = nonce + 1;
        }

        /* solhint-disable no-inline-assembly */
        assembly ("memory-safe") {
            let length := mload(transactions)
            let i := 0x20
            for {

            } lt(i, length) {

            } {
                let operation := shr(0xf8, mload(add(transactions, i)))
                let to := shr(0x60, mload(add(transactions, add(i, 0x01))))
                let value := mload(add(transactions, add(i, 0x15)))
                let dataLength := mload(add(transactions, add(i, 0x35)))
                let data := add(transactions, add(i, 0x55))
                let success := 0
                switch operation
                case 0 {
                    success := call(gas(), to, value, data, dataLength, 0, 0)
                }
                case 1 {
                    success := delegatecall(gas(), to, data, dataLength, 0, 0)
                }
                if eq(success, 0) {
                    returndatacopy(0, 0, returndatasize())
                    revert(0, returndatasize())
                }
                i := add(i, add(0x55, dataLength))
            }
        }
        /* solhint-enable no-inline-assembly */
    }

    /**
     * @dev ERC-1271: Validates if the provided signature is valid for the given hash.
     * @param hash The hash of the signed data.
     * @param signature The signature to validate.
     * @return magicValue The ERC-1271 magic value (0x1626ba7e) if the signature is valid, 0x00000000 otherwise.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) public view returns (bytes4 magicValue) {
        (uint256 r, uint256 vs) = abi.decode(signature, (uint256, uint256));
        bool ok = _isValidSignature(hash, r, vs);

        assembly ("memory-safe") {
            magicValue := mul(ok, hex"1626ba7e")
        }
    }

    /**
     * @dev Validates the signature by extracting `v` and `s` from `vs` and using `ecrecover`.
     * @param hash The hash of the signed data.
     * @param r The r part of the signature.
     * @param vs The v and s part of the signature combined.
     * @return bool True if the signature is valid, false otherwise.
     */
    function _isValidSignature(bytes32 hash, uint256 r, uint256 vs) internal view returns (bool) {
        unchecked {
            uint256 v = (vs >> 255) + 27;
            uint256 s = vs & 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
            return address(this) == ecrecover(hash, uint8(v), bytes32(r), bytes32(s));
        }
    }

    function _storage() private pure returns (Storage storage $) {
        assembly ("memory-safe") {
            $.slot := _STORAGE
        }
    }
}
