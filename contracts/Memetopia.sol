// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC721.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
// NFT Marketplace like OpenSea

contract MemeTopia {
    uint256 public listingCount;

    address public owner;

    uint256 private _Fee = 0.01 ether;

    struct NftListing {
        uint256 id;
        uint256 price;
        address lister;
        bool isCompleted;
        bool isDelisted;
        address buyer;
    }

    constructor() {
        owner = msg.sender;
    }

    // since each tokeId is distinct, we can use it as a map key
    // nft -> tokenId -> listing
    mapping(address => mapping(uint => NftListing)) nftAddressTotokenIdToNftListing;

    // seller -> nft -> tokenId[]
    mapping(address => mapping(address => uint256[])) sellerToNftToCreatedNftListings;

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

    function checkIfOwner(
        uint256 _tokenId,
        address _owner,
        address _nftAddress
    ) private view returns (bool) {
        sanityCheck(_owner);
        return IERC721(_nftAddress).ownerOf(_tokenId) == _owner;
    }

    function onlyOwner(uint256 _tokenId, address _nftAddress) private view {
        if (!checkIfOwner(_tokenId, msg.sender, _nftAddress)) {
            revert Errors.OnlyOwner();
        }
    }

    function checkIfOwnerHasListedNFT(
        uint256 _tokenId,
        address _nftAddress
    ) private view returns (bool) {
        NftListing memory nftListing = nftAddressTotokenIdToNftListing[
            _nftAddress
        ][_tokenId];
        return nftListing.id != 0;
    }

    function getNFTListing(
        uint256 _tokenId,
        address _nftAddress
    ) external view returns (NftListing memory) {
        if (!checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.NftHasNotBeenListed();
        }
        NftListing memory nftListing = nftAddressTotokenIdToNftListing[
            _nftAddress
        ][_tokenId];
        return nftListing;
    }

    // @dev: User main functions
    function transferOwnership(
        uint256 _tokenId,
        address _to,
        address _nftAddress
    ) external {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);
        // check if Nft is in an existing listing
        if (checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.CannotTransferAListedNFT();
        }

        // only owner of NFT can  transferOwnership
        onlyOwner(_tokenId, _nftAddress);

        IERC721(_nftAddress).transferFrom(msg.sender, _to, _tokenId);

        emit Events.NftOwnershipTransferedSuccessfully(
            msg.sender,
            _to,
            _tokenId
        );
    }

    function listNft(
        uint256 _tokenId,
        uint256 _amount,
        address _nftAddress
    ) external payable {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);

        // to prevent an owner from listing NFT 2ce
        if (checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.CannotListTwice();
        }

        // only owner of NFT can  list it
        onlyOwner(_tokenId, _nftAddress);

        zeroValueCheck(_amount);

        if (msg.value < _Fee) {
            revert Errors.FeePaymentIsRequired();
        }

        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _tokenId);

        uint256 _id = listingCount + 1;
        // the buyer address is set to the default address -> address zero
        nftAddressTotokenIdToNftListing[_nftAddress][_tokenId] = NftListing(
            _id,
            _amount,
            msg.sender,
            false,
            false,
            address(0)
        );

        sellerToNftToCreatedNftListings[msg.sender][_nftAddress].push(_tokenId);

        listingCount++;

        emit Events.NftListedSuccessfully(msg.sender, _amount, _tokenId);
    }

    // allows users list a delisted NFT listing
    // also to update the amount
    function updateNftListingPrice(
        uint256 _tokenId,
        uint256 _amount,
        address _nftAddress
    ) external {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);

        // to prevent an owner from listing NFT 2ce
        if (!checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.NftHasNotBeenListed();
        }

        // only owner of the NFT listing can  update it
        onlyOwner(_tokenId, _nftAddress);

        zeroValueCheck(_amount);

        NftListing memory nftListing = nftAddressTotokenIdToNftListing[
            _nftAddress
        ][_tokenId];

        if (nftListing.isCompleted) {
            revert Errors.NftHasBeenBoughtAlready();
        }

        nftAddressTotokenIdToNftListing[_nftAddress][_tokenId].price = _amount;

        emit Events.NftListingPriceUpdated(
            msg.sender,
            _tokenId,
            _nftAddress,
            nftListing.price,
            _amount
        );
    }

    function activateDelistedNftListing(
        uint256 _tokenId,
        address _nftAddress
    ) external payable {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);

        // to prevent an owner from listing NFT 2ce
        if (!checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.NftHasNotBeenListed();
        }

        NftListing memory nftListing = nftAddressTotokenIdToNftListing[
            _nftAddress
        ][_tokenId];

        // only owner of the NFT listing can  activate it
        if (!(nftListing.lister == msg.sender)) {
            revert Errors.OnlyOwner();
        }

        if (nftListing.isCompleted) {
            revert Errors.NftHasBeenBoughtAlready();
        }

        // charge only if the NFT has been delisted
        if (!nftListing.isDelisted) {
            revert Errors.NftListingIsStillActive();
        }
        if (msg.value < _Fee) {
            revert Errors.FeePaymentIsRequired();
        }

        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _tokenId);

        nftAddressTotokenIdToNftListing[_nftAddress][_tokenId]
            .isDelisted = false;

        emit Events.NftListingActivated(msg.sender, _tokenId, _nftAddress);
    }

    function mint(address _nftAddress) external {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);

        IERC721(_nftAddress).mint(msg.sender);

        emit Events.MintedNftSuccessfully(msg.sender);
    }

    function delistNft(uint256 _tokenId, address _nftAddress) external {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);

        if (!checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.NftHasNotBeenListed();
        }

        NftListing memory nftListing = nftAddressTotokenIdToNftListing[
            _nftAddress
        ][_tokenId];

        if (!(nftListing.lister == msg.sender)) {
            revert Errors.OnlyOwner();
        }

        if (nftListing.isCompleted) {
            revert Errors.NftHasBeenBoughtAlready();
        }
        if (nftListing.isDelisted) {
            revert Errors.NftIsNolongerAvailable();
        }

        nftAddressTotokenIdToNftListing[_nftAddress][_tokenId]
            .isDelisted = true;

        IERC721(_nftAddress).transferFrom(address(this), msg.sender, _tokenId);

        emit Events.NftDelistedSuccessfully(
            msg.sender,
            nftListing.price,
            _tokenId
        );
    }

    function buyNft(uint256 _tokenId, address _nftAddress) external payable {
        sanityCheck(msg.sender);
        sanityCheck(_nftAddress);

        // if owner has not listed NFT
        if (!checkIfOwnerHasListedNFT(_tokenId, _nftAddress)) {
            revert Errors.NftHasNotBeenListed();
        }

        NftListing memory nftListing = nftAddressTotokenIdToNftListing[
            _nftAddress
        ][_tokenId];

        if (nftListing.isCompleted) {
            revert Errors.NftHasBeenBoughtAlready();
        }
        if (nftListing.isDelisted) {
            revert Errors.NftIsNolongerAvailable();
        }

        if (nftListing.lister == msg.sender) {
            revert Errors.OwnerCannotBuySelfListedNft();
        }

        if (msg.value < (_Fee + nftListing.price)) {
            revert Errors.InsufficientAmount();
        }

        nftAddressTotokenIdToNftListing[_nftAddress][_tokenId]
            .isCompleted = true;

        IERC721(_nftAddress).transferFrom(address(this), msg.sender, _tokenId);

        (bool _success, ) = nftListing.lister.call{value: nftListing.price}("");

        if (!_success) {
            revert Errors.TransferFailed();
        }

        nftAddressTotokenIdToNftListing[_nftAddress][_tokenId].buyer = msg
            .sender;

        emit Events.NftBoughtSuccessfully(
            nftListing.lister,
            msg.sender,
            nftListing.price,
            _tokenId
        );
    }

    function getFee() external view returns (uint256) {
        return _Fee;
    }

    function getContractBalance() external view returns (uint256) {
        if (msg.sender != owner) {
            revert Errors.OnlyOwner();
        }
        return address(this).balance;
    }

    function withdrawBalance() external payable {
        sanityCheck(msg.sender);

        if (msg.sender != owner) {
            revert Errors.OnlyOwner();
        }
        uint contractBal = address(this).balance;

        zeroValueCheck(contractBal);

        (bool _success, ) = msg.sender.call{value: contractBal}("");
        if (!_success) {
            revert Errors.TransferFailed();
        }
        emit Events.WithdrawalSuccessful(msg.sender, contractBal);
    }
}
