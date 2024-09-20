// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC721.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
// NFT Marketplace like OpenSea

contract MemeTopia {
    address public nftAddress;

    uint256 public listingCount;

    uint256 private _Fee = 0.01 ether;

    struct NftListing {
        uint256 id;
        uint256 price;
        address lister;
        bool isCompleted;
        bool isDelisted;
        address buyer;
    }

    // since each tokeId is distinct, we can use it as a map key
    mapping(uint => NftListing) tokenIdToNftListing;

    mapping(address => uint256[]) sellerToCreatedNftListings;

    constructor(address _nftAddress) {
        nftAddress = _nftAddress;
    }

    function sanityCheck(address _user) private pure {
        if (_user == address(0)) {
            revert Errors.ZeroAddressNotAllowed();
        }
    }

    function zeroValueCheck(uint256 _amount) private pure {
        if (_amount <= 0) {
            revert Errors.ZeroValueNotAllowed();
        }
    }

    function onlyOwner(uint256 _tokenId) private view {
        if (!checkIfOwner(_tokenId, msg.sender)) {
            revert Errors.OnlyOwner();
        }
    }

    function checkIfOwner(
        uint256 _tokenId,
        address _owner
    ) private view returns (bool) {
        sanityCheck(_owner);
        return IERC721(nftAddress).ownerOf(_tokenId) == _owner;
    }

    function checkIfOwnerHasListedNFT(
        uint256 _tokenId
    ) private view returns (bool) {
        NftListing memory nftListing = tokenIdToNftListing[_tokenId];
        return nftListing.id != 0;
    }

    // @dev: User main functions
    function transferOwnership(uint256 _tokenId, address _to) external {
        // check if Nft is in an existing listing
        if (checkIfOwnerHasListedNFT(_tokenId)) {
            revert Errors.CannotTransferAListedNFT();
        }

        // only owner of NFT can  transferOwnership
        onlyOwner(_tokenId);

        IERC721(nftAddress).transferFrom(msg.sender, _to, _tokenId);

        emit Events.NftOwnershipTransferedSuccessfully(
            msg.sender,
            _to,
            _tokenId
        );
    }

    function listNft(uint256 _tokenId, uint256 _amount) external payable {
        sanityCheck(msg.sender);

        // only owner of NFT can  list it
        onlyOwner(_tokenId);

        // to prevent an owner from listing NFT 2ce
        if (checkIfOwnerHasListedNFT(_tokenId)) {
            revert Errors.CannotListTwice();
        }

        zeroValueCheck(_amount);

        if (msg.value < _Fee) {
            revert Errors.FeePaymentIsRequired();
        }

        IERC721(nftAddress).transferFrom(msg.sender, address(this), _tokenId);

        uint256 _id = listingCount + 1;
        // the buyer address is set to the default address -> address zero
        tokenIdToNftListing[_tokenId] = NftListing(
            _id,
            _amount,
            msg.sender,
            false,
            false,
            address(0)
        );

        sellerToCreatedNftListings[msg.sender].push(_tokenId);

        listingCount++;

        emit Events.NftListedSuccessfully(msg.sender, _amount, _tokenId);
    }

    function mint() external {
        sanityCheck(msg.sender);
        IERC721(nftAddress).mint(msg.sender);

        emit Events.MintedNftSuccessfully(msg.sender);
    }

    function delistNft(uint256 _tokenId) external {
        sanityCheck(msg.sender);

        if (!checkIfOwnerHasListedNFT(_tokenId)) {
            revert Errors.NftHasNotBeenListed();
        }

        NftListing memory nftListing = tokenIdToNftListing[_tokenId];

        if (!(nftListing.lister == msg.sender)) {
            revert Errors.OnlyOwner();
        }

        if (nftListing.isCompleted) {
            revert Errors.NftHasBeenBoughtAlready();
        }
        if (nftListing.isDelisted) {
            revert Errors.NftIsNolongerAvailable();
        }

        tokenIdToNftListing[_tokenId].isDelisted = true;

        IERC721(nftAddress).transferFrom(address(this), msg.sender, _tokenId);
    }

    function buyNft(uint256 _tokenId) external payable {
        sanityCheck(msg.sender);

        // if owner has not listed NFT
        if (!checkIfOwnerHasListedNFT(_tokenId)) {
            revert Errors.NftHasNotBeenListed();
        }

        NftListing memory nftListing = tokenIdToNftListing[_tokenId];

        if (nftListing.isCompleted) {
            revert Errors.NftHasBeenBoughtAlready();
        }
        if (nftListing.isDelisted) {
            revert Errors.NftIsNolongerAvailable();
        }

        if (msg.value < (_Fee + nftListing.price)) {
            revert Errors.InsufficientAmount();
        }

        tokenIdToNftListing[_tokenId].isCompleted = true;

        IERC721(nftAddress).transferFrom(address(this), msg.sender, _tokenId);

        emit Events.NftSoldSuccessfully(
            nftListing.lister,
            msg.sender,
            msg.value,
            _tokenId
        );
    }

    function getFee() external view returns (uint256) {
        return _Fee;
    }
}
