// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC721.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract MemeTopia {
    address public nftAddress;

    uint256 public listingCount;

    struct NftListing {
        uint256 id;
        uint256 amount;
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

    function checkIfOwner(uint256 _tokenId) private view returns (bool) {
        sanityCheck(msg.sender);
        return IERC721(nftAddress).ownerOf(_tokenId) == msg.sender;
    }

    function checkIfOwnerHasListedNFT(
        uint256 _tokenId
    ) private view returns (bool) {
        NftListing memory nftListing = tokenIdToNftListing[_tokenId];
        return nftListing.id != 0;
    }

    // @dev: User main functions
    function transferOwnership(uint256 _tokenId) external {
        // check if Nft is in an existing listing
    }

    function listNft(uint256 _tokenId, uint256 _amount) external {
        sanityCheck(msg.sender);

        // only owner of NFT can  list it
        if (!checkIfOwner(_tokenId)) {
            revert Errors.NftNotFound();
        }

        // to prevent an owner from listing NFT 2ce
        if (checkIfOwnerHasListedNFT(_tokenId)) {
            revert Errors.CannotListTwice();
        }

        zeroValueCheck(_amount);

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

    function delistNft(uint256 _tokenId) external {}

    function buyNft(uint256 _tokenId) external payable {
        
    }
}
