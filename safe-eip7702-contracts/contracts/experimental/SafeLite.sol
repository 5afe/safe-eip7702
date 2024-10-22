// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;

/**
 * @title SafeLite - A lite version of Safe with multi-send functionality. The contract uses only storage slot 0 to track nonce.
 *                   The contract is intended to be used with EIP-7702 where EOA delegates to this contract.
 */
contract SafeLite {
    address private immutable MULTISEND_SINGLETON;
    uint256 public nonce;

    // Custom error types
    error OnlyDelegateCall();
    error InvalidNonce();
    error InvalidSignature();
    error InvalidSignatureLength();

    // EIP-712 Domain separator and type hash for the struct
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant MULTISEND_TYPEHASH = keccak256("MultiSend(bytes32 data,uint256 nonce)");

    constructor() {
        MULTISEND_SINGLETON = address(this);
    }

    /**
     * @dev Sends multiple transactions with signature validation and reverts all if one fails.
     * @param transactions Encoded transactions.
     * @param signature The signature to validate.
     * @param _nonce The unique nonce to ensure transaction uniqueness.
     */
    function multiSend(bytes memory transactions, bytes memory signature, uint256 _nonce) public payable {
        if (address(this) == MULTISEND_SINGLETON) {
            revert OnlyDelegateCall();
        }

        // Ensure correct nonce is used
        if (_nonce != nonce) {
            revert InvalidNonce();
        }

        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes("SafeLite")), keccak256(bytes("1")), block.chainid, address(this))
        );

        // Calculate the hash of transactions data and nonce for signature verification
        bytes32 structHash = keccak256(abi.encode(MULTISEND_TYPEHASH, keccak256(transactions), nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        // Verify the signature
        address signer = recoverSigner(digest, signature);
        if (signer != address(this)) {
            revert InvalidSignature();
        }

        // Update nonce for the sender to prevent replay attacks
        nonce++;

        /* solhint-disable no-inline-assembly */
        assembly {
            let length := mload(transactions)
            let i := 0x20
            for {} lt(i, length) {} {
                let operation := shr(0xf8, mload(add(transactions, i)))
                let to := shr(0x60, mload(add(transactions, add(i, 0x01))))
                to := or(to, mul(iszero(to), address()))
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
     * @return The ERC-1271 magic value (0x1626ba7e) if the signature is valid, 0xffffffff otherwise.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) public view returns (bytes4) {
        // Verify if the signature corresponds to the hash signed by the contract itself
        address signer = recoverSigner(hash, signature);
        if (signer == address(this)) {
            return 0x1626ba7e;
        } else {
            return 0x00000000;
        }
    }

    /**
     * @dev Recover the signer from the signature.
     * @param hash The hash of the signed data.
     * @param signature The signature to recover the signer from.
     */
    function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) {
            revert InvalidSignatureLength();
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Divide the signature into r, s and v variables
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // Recover the signer address
        return ecrecover(hash, v, r, s);
    }
}
