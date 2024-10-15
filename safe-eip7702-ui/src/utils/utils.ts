import { encodePacked, keccak256, getContractAddress, PublicClient, Address } from 'viem'
import safeEIP7702Proxy from "../safe-eip7702-config/artifact/SafeEIP7702Proxy.json";

export const ACCOUNT_CODE_PREFIX = "0xef0100";

export const getProxyAddress = (
    factory: `0x${string}`,
    singleton: `0x${string}`,
    inititalizer: `0x${string}`,
    nonce: bigint,
    proxyCreationCode?: `0x${string}`,
) => {
    const salt = keccak256(encodePacked(["bytes32", "uint256"], [keccak256(encodePacked(["bytes"], [inititalizer])), nonce]));    
    
    if(!proxyCreationCode){
        proxyCreationCode = safeEIP7702Proxy.bytecode as `0x${string}`;
    }

    const deploymentCode = encodePacked(["bytes", "uint256", "uint256"], [proxyCreationCode || "0x", keccak256(inititalizer) as any, singleton as any]);
    return getContractAddress({ 
        bytecode: deploymentCode, 
        from: factory, 
        opcode: 'CREATE2', 
        salt: salt, 
      }); 
};

export type MultiSendTransaction = {
    to: `0x${string}`,
    value: bigint,
    data: `0x${string}`,
    operation: number,
}

export type MultiSendTransactions = MultiSendTransaction[];

export const getMultiSendCallData = (transactions: MultiSendTransactions): `0x${string}` => {

    // Encode the transactions into the format required by MultiSend contract
    let packedTransactions = '0x'; // Start with empty hex string
    for (const tx of transactions) {
    const encodedTx = encodePacked(
        ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
        [tx.operation, tx.to, tx.value, BigInt(tx.data.length), tx.data]
    );
    packedTransactions += encodedTx.slice(2); // Append the packed transaction data
    }
    return packedTransactions as `0x${string}`;
   
}


// Function to check if the account is delegated
export const isAccountDelegated = async (client: PublicClient, account: Address): Promise<boolean> => {
    const codeAtEOA = await client.getCode({ address: account });
    return codeAtEOA?.length === 48 && codeAtEOA.startsWith(ACCOUNT_CODE_PREFIX);
};

// Function to check if the account is delegated to a specific address
export const isAccountDelegatedToAddress = async (
    client: PublicClient, 
    account: Address, 
    authority: Address
): Promise<boolean> => {
    const codeAtEOA = await client.getCode({ address: account });

    return (
        codeAtEOA?.length === 48 &&
        codeAtEOA.startsWith(ACCOUNT_CODE_PREFIX) &&
        `0x${codeAtEOA.slice(8)}`.toLowerCase() === authority.toLowerCase()
    );
};

// Function to get the address the account is delegated to
export const getDelegatedToAddress = async (
    client: PublicClient, 
    account: Address
): Promise<Address> => {
    const codeAtEOA = await client.getCode({ address: account });

    if (!codeAtEOA || codeAtEOA.length < 48) {
        throw new Error('Invalid code length');
    }
    
    return `0x${codeAtEOA.slice(8)}` as Address;
};