// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Errors {
    error ZeroAddressNotAllowed();
    error ZeroValueNotAllowed();
    error OnlyOwner();
    error NftHasNotBeenListed();
    error CannotListTwice();
    error NftHasBeenBoughtAlready();
    error NftIsNolongerAvailable();
    error FeePaymentIsRequired();
    error InsufficientAmount();
    error CannotTransferAListedNFT();
    error TransferFailed();
    error OwnerCannotBuySelfListedNft();
    error NftListingIsStillActive();
}

library Events {
    event NftListedSuccessfully(
        address indexed _lister,
        uint256 indexed _amount,
        uint256 indexed _tokenId
    );
    event NftDelistedSuccessfully(
        address indexed _lister,
        uint256 indexed _amount,
        uint256 indexed _tokenId
    );

    event MintedNftSuccessfully(address indexed _to);

    event NftBoughtSuccessfully(
        address indexed _lister,
        address indexed _buyer,
        uint256 _price,
        uint256 indexed _tokenId
    );

    event NftOwnershipTransferedSuccessfully(
        address indexed _from,
        address indexed _to,
        uint256 indexed _tokenId
    );

    event WithdrawalSuccessful(
        address indexed _to,
        uint256 indexed _amount
    );

    event NftListingActivated(
        address indexed _owner,
        uint256 indexed _tokenId,
        address indexed _nftAddress
    );

    event NftListingPriceUpdated(
        address indexed _owner,
        uint256 indexed _tokenId,
        address indexed _nftAddress,
        uint256 _former,
        uint256 _new
    );
}
