// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Errors {
    error ZeroAddressNotAllowed();
    error ZeroValueNotAllowed();
    error NftNotFound();
    error CannotListTwice();
}

library Events {
    event NftListedSuccessfully(
        address indexed _lister,
        uint256 indexed _amount,
        uint256 indexed _tokenId
    );
}
