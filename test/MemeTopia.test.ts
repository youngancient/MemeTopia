import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

describe("MemeTopia NftMarketplace", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNft() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();
    // token we are using to test
    const NFTContract = await hre.ethers.getContractFactory("CorpPepe");

    const _tokenUri = process.env.TOKEN_URI!;
    const corpPepe = await NFTContract.deploy(_tokenUri);

    const _tokenUri1 = process.env.TOKEN_URI2!;
    const clownPepe = await NFTContract.deploy(_tokenUri1);

    return { corpPepe, clownPepe };
  }

  async function deployMemeTopia() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await hre.ethers.getSigners();

    const { corpPepe, clownPepe } = await loadFixture(deployNft);

    const MemeTopia = await hre.ethers.getContractFactory("MemeTopia");
    const memeTopia = await MemeTopia.deploy();

    await corpPepe.connect(account1).mint(account1);
    await clownPepe.connect(account2).mint(account2);

    return {
      owner,
      account1,
      account2,
      account3,
      memeTopia,
      corpPepe,
      clownPepe,
    };
  }

  describe("Deployment", function () {
    it("Should set owner", async function () {
      const { owner, account1, memeTopia, corpPepe, clownPepe, account2 } =
        await loadFixture(deployMemeTopia);

      expect(await memeTopia.owner()).to.equal(owner);

      await expect(memeTopia.withdrawBalance()).to.be.revertedWithCustomError(
        memeTopia,
        "ZeroValueNotAllowed"
      );
    });
    it("The Nft contracts should allow anybody mint", async function () {
      const { owner, account1, memeTopia, corpPepe, clownPepe, account2 } =
        await loadFixture(deployMemeTopia);

      expect(await corpPepe.balanceOf(account1)).to.equal(1);

      let tokenId = 1;
      expect(await corpPepe.ownerOf(tokenId)).to.equal(account1);

      expect(await clownPepe.balanceOf(account2)).to.equal(1);

      let tokenId1 = 1;
      expect(await clownPepe.ownerOf(tokenId1)).to.equal(account2);
    });
  });
  describe("List NFT", function () {
    it("Should revert if non-owner tries to list an NFT", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");

      await expect(
        memeTopia.connect(account3).listNft(validTokenId, price, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "OnlyOwner");
    });
    it("Should revert if NFT price is zero", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("0");

      await expect(
        memeTopia.connect(account1).listNft(validTokenId, price, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "ZeroValueNotAllowed");
    });
    it("Should revert if NFT price is zero", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("0");

      await expect(
        memeTopia.connect(account1).listNft(validTokenId, price, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "ZeroValueNotAllowed");
    });
    it("Should revert if payment is not made", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");

      await expect(
        memeTopia.connect(account1).listNft(validTokenId, price, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "FeePaymentIsRequired");
    });
    it("Should list NFT successfully", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      await expect(
        memeTopia
          .connect(account1)
          .listNft(validTokenId, price, corpPepe, { value: fee + price })
      )
        .to.emit(memeTopia, "NftListedSuccessfully")
        .withArgs(account1, price, validTokenId);

      expect(await memeTopia.listingCount()).to.equal(1);
    });
    it("Should revert if owner tries to list an NFT twice", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      await expect(
        memeTopia
          .connect(account1)
          .listNft(validTokenId, price, corpPepe, { value: fee + price })
      )
        .to.emit(memeTopia, "NftListedSuccessfully")
        .withArgs(account1, price, validTokenId);

      await expect(
        memeTopia
          .connect(account1)
          .listNft(validTokenId, price, corpPepe, { value: fee + price })
      ).to.be.revertedWithCustomError(memeTopia, "CannotListTwice");
    });
  });

  describe("Buy NFT", function () {
    it("Should list NFT successfully", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      await expect(
        memeTopia
          .connect(account1)
          .listNft(validTokenId, price, corpPepe, { value: fee + price })
      )
        .to.emit(memeTopia, "NftListedSuccessfully")
        .withArgs(account1, price, validTokenId);

      expect(await memeTopia.listingCount()).to.equal(1);
    });
  });

  describe("Delist NFT", function () {
    it("Should revert owner tries to delist an NFT not owned by him", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      // list
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee + price });

      //  delist
      await expect(
        memeTopia.connect(account2).delistNft(validTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "OnlyOwner");
    });
    it("Should revert owner tries to delist an NFT not listed", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let invalidTokenId = 5;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      // list
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee + price });

      //  delist
      await expect(
        memeTopia.connect(account2).delistNft(invalidTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "NftHasNotBeenListed");
    });
    it("Should delist a listed NFT successfully", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      // list
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee + price });

      //  delist

      await expect(
        memeTopia.connect(account1).delistNft(validTokenId, corpPepe)
      )
        .to.emit(memeTopia, "NftDelistedSuccessfully")
        .withArgs(account1, price, validTokenId);

      expect(await corpPepe.ownerOf(validTokenId)).to.equal(account1);
    });
    it("Should revert if owner tries to delist twice", async function () {
      const {
        owner,
        account1,
        account3,
        memeTopia,
        corpPepe,
        clownPepe,
        account2,
      } = await loadFixture(deployMemeTopia);
      let validTokenId = 1;
      let price = ethers.parseEther("50");
      let fee = await memeTopia.getFee();

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      // list
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee + price });

      //  delist

      await expect(
        memeTopia.connect(account1).delistNft(validTokenId, corpPepe)
      )
        .to.emit(memeTopia, "NftDelistedSuccessfully")
        .withArgs(account1, price, validTokenId);

      await expect(
        memeTopia.connect(account1).delistNft(validTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "NftIsNolongerAvailable");
    });
    // should revert if owner tries to delist an already bought NFT
  });
});
