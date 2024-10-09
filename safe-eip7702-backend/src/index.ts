import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { safeEIP7702Addresses } from "./config/addresses";

dotenv.config(); 
import { client, walletClient } from './wallet';

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
    res.send('Relay service for Safe EIP-7702');
});

app.post('/', async (req: Request, res: Response) => {

    console.log("Request body\n", req.body);
    let txHash;

    if(req.body["initData"]){
        const proxyAddress = req.body["authorizationList"][0].contractAddress as `0x${string}`;
        if (await client.getCode({address: proxyAddress})) {
            console.log("Proxy already deployed");
            txHash = await walletClient.sendTransaction({
                type: "eip7702",
                to: "0x" + "00".repeat(20) as `0x${string}`,
                data: "0x" as `0x${string}`,
                value: BigInt(0),
                authorizationList: req.body["authorizationList"],
            }); 
        } else {
            txHash = await walletClient.sendTransaction({
                type: "eip7702",
                to: safeEIP7702Addresses[7011893082].proxyFactory,
                data: req.body["initData"],
                value: BigInt(0),
                authorizationList: req.body["authorizationList"],
            })
        }
    } else {
        txHash = await walletClient.sendTransaction({
            type: "eip7702",
            to: "0x" + "00".repeat(20) as `0x${string}`,
            data: "0x" as `0x${string}`,
            value: BigInt(0),
            authorizationList: req.body["authorizationList"],
        }); 
    }

    res.status(201).json({txHash})
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});