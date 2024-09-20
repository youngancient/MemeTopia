// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract CorpPepe is ERC721, ERC721URIStorage, Ownable {
    string _uri;
    uint256 _tokenId;
    constructor(string memory _tokenUri)
        ERC721("CorpPepe", "MRPEPE")
        Ownable(msg.sender)
    {
        _uri = _tokenUri;
    }

    function mint(address to)
        public
    {
        uint256 _id = _tokenId + 1;
        _safeMint(to, _id);
        _setTokenURI(_id, _uri);
        _tokenId ++;
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
