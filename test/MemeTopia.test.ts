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
    it("Should revert if payment is insufficient", async function () {
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
    it("Should allow a user list an NFT he newly bought on the marketplace", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await expect(
        memeTopia
          .connect(account3)
          .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee })
      )
        .to.emit(memeTopia, "NftBoughtSuccessfully")
        .withArgs(nftListing.lister, account3, nftListing.price, validTokenId);

      expect(await corpPepe.ownerOf(validTokenId)).to.equal(account3);

      // account3 is the new owner, he tries to list with a different price
      let price2 = ethers.parseEther("50");
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price2, corpPepe, { value: fee });

    });
  });

  describe("Buy NFT", function () {
    it("Should revert if user tries to buy an NFT with an invalid tokenId", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee + price });

      let invalidTokenId = 10;

      await expect(
        memeTopia.connect(account3).buyNft(invalidTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "NftHasNotBeenListed");
    });
    it("Should revert if NFT has been delisted", async function () {
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

      // buy NFT
      await expect(
        memeTopia.connect(account3).buyNft(validTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "NftIsNolongerAvailable");
    });
    it("Should revert if owner who listed NFT tries to buy the NFT", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      await expect(
        memeTopia.connect(account1).buyNft(validTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "OwnerCannotBuySelfListedNft");
    });
    it("Should revert if payment is insufficient", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      await expect(
        memeTopia.connect(account3).buyNft(validTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "InsufficientAmount");
    });
    it("Should buy successfully", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await expect(
        memeTopia
          .connect(account3)
          .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee })
      )
        .to.emit(memeTopia, "NftBoughtSuccessfully")
        .withArgs(nftListing.lister, account3, nftListing.price, validTokenId);

      expect(await corpPepe.ownerOf(validTokenId)).to.equal(account3);

      expect(await memeTopia.getContractBalance()).to.equal(fee * BigInt(2));
    });
  
    it("Should revert if buyer tries to buy twice", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await expect(
        memeTopia
          .connect(account3)
          .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee })
      )
        .to.emit(memeTopia, "NftBoughtSuccessfully")
        .withArgs(nftListing.lister, account3, nftListing.price, validTokenId);

      // buy same NFT again
      await expect(
        memeTopia
          .connect(account3)
          .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee })
      ).to.be.revertedWithCustomError(memeTopia, "NftHasBeenBoughtAlready");
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
    it("Should revert if owner tries to delist an already bought NFT", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await expect(
        memeTopia
          .connect(account3)
          .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee })
      )
        .to.emit(memeTopia, "NftBoughtSuccessfully")
        .withArgs(nftListing.lister, account3, nftListing.price, validTokenId);

      // delist same NFT by previous owner
      await expect(
        memeTopia.connect(account1).delistNft(validTokenId, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "NftHasBeenBoughtAlready");
    });
  });

  describe("Activate Delisted NFT Listing", function () {
    it("Should revert if NFT has been bought", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await expect(
        memeTopia
          .connect(account3)
          .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee })
      )
        .to.emit(memeTopia, "NftBoughtSuccessfully")
        .withArgs(nftListing.lister, account3, nftListing.price, validTokenId);

      // activate
      await expect(
        memeTopia
          .connect(account1)
          .activateDelistedNftListing(validTokenId, corpPepe, { value: fee })
      ).to.be.revertedWithCustomError(memeTopia, "NftHasBeenBoughtAlready");
    });

    it("Should allow owner list a delisted listing successfully", async function () {
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

      // list again

      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      await expect(
        memeTopia
          .connect(account1)
          .activateDelistedNftListing(validTokenId, corpPepe, { value: fee })
      )
        .to.emit(memeTopia, "NftListingActivated")
        .withArgs(account1, validTokenId, corpPepe);

      expect((await memeTopia.getNFTListing(validTokenId, corpPepe)).isDelisted)
        .to.be.false;
    });
    it("Should revert if NFT listing is still active", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // activate
      await expect(
        memeTopia
          .connect(account1)
          .activateDelistedNftListing(validTokenId, corpPepe, { value: fee })
      ).to.be.revertedWithCustomError(memeTopia, "NftListingIsStillActive");

    });
    it("Should revert if called my nonOwner of NFT listing", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // activate
      await expect(
        memeTopia
          .connect(account2)
          .activateDelistedNftListing(validTokenId, corpPepe, { value: fee })
      ).to.be.revertedWithCustomError(memeTopia, "OnlyOwner");

    });
  });

  describe("Transfer NFT ownership", function () {
    it("Should revert if owner tries to transfer ownership of a listed NFT", async function () {
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
          .transferOwnership(validTokenId, account3, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "CannotTransferAListedNFT");
    });
    it("Should revert if a user tries to transfer ownership of an NFT he does not own", async function () {
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

      await expect(
        memeTopia.transferOwnership(validTokenId, account3, corpPepe)
      ).to.be.revertedWithCustomError(memeTopia, "OnlyOwner");
    });
    it("Should transfer ownership successfully", async function () {
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
      await corpPepe.connect(account1).approve(memeTopia, validTokenId);

      await expect(
        memeTopia
          .connect(account1)
          .transferOwnership(validTokenId, account3, corpPepe)
      )
        .to.emit(memeTopia, "NftOwnershipTransferedSuccessfully")
        .withArgs(account1, account3, validTokenId);

      expect(await corpPepe.ownerOf(validTokenId)).to.equal(account3);
    });
  });

  describe("Owner withdraw Balance", function () {
    it("Should revert if caller is not owner", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee + price });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await memeTopia
        .connect(account3)
        .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee });

      await expect(
        memeTopia.connect(account1).withdrawBalance()
      ).to.be.revertedWithCustomError(memeTopia, "OnlyOwner");
    });
    it("Should withdraw contract balance to owner successfully", async function () {
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

      // list NFT
      await memeTopia
        .connect(account1)
        .listNft(validTokenId, price, corpPepe, { value: fee });

      // get nftListing

      const nftListing = await memeTopia.getNFTListing(validTokenId, corpPepe);

      // buy NFT
      await memeTopia
        .connect(account3)
        .buyNft(validTokenId, corpPepe, { value: nftListing.price + fee });

      let contractBal = await await memeTopia.getContractBalance();

      let ownerBalBefore = await ethers.provider.getBalance(owner);

      await expect(memeTopia.withdrawBalance())
        .to.emit(memeTopia, "WithdrawalSuccessful")
        .withArgs(owner, contractBal);

      let ownerBalAfter = await ethers.provider.getBalance(owner);

      expect(ownerBalAfter).to.greaterThan(ownerBalBefore);
    });
  });
});

// continuity problem: a buyer listing an NFT he bought
// a seller listing an NFT he previously delisted
