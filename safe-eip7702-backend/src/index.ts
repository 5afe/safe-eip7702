import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

import { safeEIP7702Addresses } from "./config/addresses";
import { client, walletClient } from './wallet';
import { toHex, zeroHash, encodeFunctionData, zeroAddress } from 'viem';
import { MultiSendABI } from './utils';
import { encodeMultiSend, MetaTransaction } from './multisend';

declare global {
    interface BigInt {
        toJSON(): Number;
    }
}

BigInt.prototype.toJSON = function () { return Number(this) }

const app = express();
app.use(express.json());
app.use(cors())

app.get('/', (req: Request, res: Response) => {
    res.send({
        "Description": "Relayer for Safe EIP-7702",
        "supportedChains": Object.keys(safeEIP7702Addresses)
    });
});

app.post('/', async (req: Request, res: Response) => {

    const { initData, authorizationList, from } = req.body;
    const chainId = authorizationList[0].chainId as number;
    const proxyAddress = authorizationList[0].contractAddress as `0x${string}`;
    const addresses = safeEIP7702Addresses[chainId];

    // Check if chain is supported
    if (!addresses) {
        res.status(400).json({ error: `Chain not supported. No proxy factory found for chainId: ${chainId}` });
        return;
    }

    let transactions: MetaTransaction[] = [];

    if (initData) {
        console.log(`Init data provided for [${proxyAddress}] : [${initData}]`);

        // Check if proxy is already deployed
        if (await client.getCode({ address: proxyAddress })) {
            console.log("Proxy already deployed");
        } else {
            console.log(`Adding transaction to deploy proxy [${proxyAddress}]`);
            // Transaction to deploy proxy with initData
            transactions.push({
                to: addresses.proxyFactory as `0x${string}`, // to: proxy factory address
                value: BigInt(0), // value: 0
                data: initData as `0x${string}`, // data: initData
                operation: 0
            });
        }
    }

    // Check if EOA is already initialized
    const slotZero = await client.getStorageAt({ address: from, slot: toHex(0) });
    if (slotZero === zeroHash) {
        // Transaction to initialize EOA
        transactions.push({
            to: from, // to: EOA address
            value: BigInt(0), // value: 0
            data: initData, // data: Init data
            operation: 0
        });
        console.log(`Added transaction to initialize EOA [${from}]`);
    }
    else {
        console.log(`EOA [${from}] already initialized. Slot 0: [${slotZero}]`);
    }

    try {
        let txHash;
        if (transactions.length > 0) {
            // Encode all transactions into a single byte string for multiSend
            const encodedTransactions = encodeMultiSend(transactions);
            const data = encodeFunctionData({ abi: MultiSendABI, functionName: 'multiSend', args: [encodedTransactions] });

            console.log(`Encoded transactions: [${data}]`);
            // Need to provide gas parameters because estimateGas call fails when using authorizationList
            // Send the multiSend transaction
            txHash = await walletClient.sendTransaction({
                to: addresses["multiSendCallOnly"], // The address of the MultiSendCallOnly contract
                data: data, // MultiSend call
                value: BigInt(0), // Value sent with the transaction
                authorizationList
            });

            // txHash = await walletClient.sendTransaction({
            //     to: addresses.proxyFactory, // The address of the MultiSendCallOnly contract
            //     data: initData, // MultiSend call
            //     value: BigInt(0), // Value sent with the transaction
            //     maxFeePerGas: BigInt(507000000000),
            //     maxPriorityFeePerGas: BigInt(50700000000),
            //     gasLimit: BigInt(50700000000000),
            //     priorityFee: BigInt(50700000000),
            // })

        } else {
            console.log("No transactions to relay. Adding sending empty transaction");
            // transactions.push(getDefaultEmptyTransaction());
            txHash = await walletClient.sendTransaction({
                to: zeroAddress,
                data: "0x",
                value: BigInt(0),
                authorizationList
            });
        }

        console.log(`Transaction hash: [${txHash}]`);
        res.status(201).json({ txHash: txHash });
    } catch (error) {
        console.error("Failed to relay authorization:", error);
        res.status(500).json({ error: error });
    }

});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
