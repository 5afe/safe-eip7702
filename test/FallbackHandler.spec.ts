import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployments, ethers } from 'hardhat'
import { expect } from "chai";
import hre from "hardhat";
import { getSafeSingleton, getFallbackHandler, getSafeProxyFactory } from "./utils/setup";

describe("FallbackHandler", function () {
    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const fallbackHandler = await getFallbackHandler();
        const safeProxyFactory = await getSafeProxyFactory();
        const safeSingleton = await getSafeSingleton();
        return { fallbackHandler, safeProxyFactory, safeSingleton };
    });

    describe("Deployment", function () {
        it("Test", async function () {
            const { fallbackHandler } = await setupTests();
            expect(await fallbackHandler.accountId()).to.equal("");
        });
    });
});
