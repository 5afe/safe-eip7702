import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("FallbackHandler", function () {

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function setup() {
  
    const [deployer, user1] = await hre.ethers.getSigners();

    const FallbackHandlerFactory = await hre.ethers.getContractFactory("FallbackHandler");
    const fallbackHandler = await FallbackHandlerFactory.deploy();

    return { fallbackHandler };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { fallbackHandler } = await loadFixture(setup);

      expect(await fallbackHandler.accountId()).to.equal("");
    });

  });

});
