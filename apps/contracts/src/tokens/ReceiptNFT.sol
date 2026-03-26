// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IReceiptNFT } from "../interfaces/IReceiptNFT.sol";
import { NFT__NotAuthorized, NFT__AlreadyMinted } from "../utils/Errors.sol";
import { ReceiptNFTMinted } from "../utils/Events.sol";

/// @title ReceiptNFT
/// @notice Transferable ERC-721 minted to client and seller at deal resolution.
///         Each resolved deal mints one receipt per participant, serving as on-chain proof of participation.
/// @dev Unlike SoulboundNFT, transfers and approvals are fully enabled — standard ERC-721 behavior.
///      Only the Escrow contract can mint. One receipt per (dealId, participant) pair.
contract ReceiptNFT is ERC721, IReceiptNFT {
    /// @notice The Escrow contract authorized to mint receipt tokens
    address public immutable escrow;

    /// @dev Next token ID to mint (starts at 1, auto-increments)
    uint256 private _nextTokenId = 1;

    /// @dev Maps tokenId to the deal it represents
    mapping(uint256 tokenId => uint256 dealId) private _dealIds;

    /// @dev Tracks whether a token has been minted for a specific deal + recipient
    mapping(uint256 dealId => mapping(address to => bool minted)) private _minted;

    /// @param escrow_ Address of the Escrow contract (immutable, only minter)
    constructor(address escrow_) ERC721("Blue Escrow Receipt", "BERCT") {
        escrow = escrow_;
    }

    // ──────────────────────────────────────────────────────────────
    //  Minting
    // ──────────────────────────────────────────────────────────────

    /// @inheritdoc IReceiptNFT
    function mint(address to, uint256 dealId) external returns (uint256 tokenId) {
        if (msg.sender != escrow) revert NFT__NotAuthorized(msg.sender);
        if (_minted[dealId][to]) revert NFT__AlreadyMinted(dealId, to);

        tokenId = _nextTokenId++;
        _dealIds[tokenId] = dealId;
        _minted[dealId][to] = true;

        _mint(to, tokenId);

        emit ReceiptNFTMinted(tokenId, to, dealId);
    }

    // ──────────────────────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────────────────────

    /// @inheritdoc IReceiptNFT
    function getDealId(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _dealIds[tokenId];
    }

    // ──────────────────────────────────────────────────────────────
    //  ERC-165 Interface Detection
    // ──────────────────────────────────────────────────────────────

    /// @dev Supports IERC721, IERC165, and IReceiptNFT.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IReceiptNFT).interfaceId || super.supportsInterface(interfaceId);
    }
}
