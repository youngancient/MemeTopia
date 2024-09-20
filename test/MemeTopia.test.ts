import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("MemeTopia NftMarketplace", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMemeTopia() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await hre.ethers.getSigners();

    const MemeTopia = await hre.ethers.getContractFactory("MemeTopia");
    const memeTopia = await MemeTopia.deploy();

    return { owner, account1, account2, memeTopia };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { owner, memeTopia } = await loadFixture(deployMemeTopia);
    });
    
  });
});
