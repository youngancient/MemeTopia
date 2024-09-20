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
  async function deployNft() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();
    // token we are using to test
    const NFTContract = await hre.ethers.getContractFactory("CorpPepe");

    const _tokenUri = "QmVjzE6hKKgxHX4wiVX94LqCzXT74UkUzzPtCaYjos45qK";
    const Nft = await NFTContract.deploy(_tokenUri);

    return { Nft };
  }

  async function deployMemeTopia() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await hre.ethers.getSigners();

    const { Nft } = await loadFixture(deployNft);

    const MemeTopia = await hre.ethers.getContractFactory("MemeTopia");
    const memeTopia = await MemeTopia.deploy(Nft);

    return { owner, account1, account2, memeTopia, Nft };
  }

  describe("Deployment", function () {
    it("Should set the Nft Contract address ", async function () {
      const { owner, memeTopia, Nft } = await loadFixture(deployMemeTopia);
      expect(await memeTopia.nftAddress()).to.equal(Nft);
    });
    it("The Nft contract should allow anybody mint", async function () {
      const { owner, account1, memeTopia, Nft } = await loadFixture(
        deployMemeTopia
      );

      await Nft.connect(account1).mint(account1);

      expect(await Nft.balanceOf(account1)).to.equal(1);

      let tokenId = 1;
      expect(await Nft.ownerOf(tokenId)).to.equal(account1);
      
    });
  });
});
