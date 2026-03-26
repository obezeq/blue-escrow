// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ISoulboundNFT } from "../interfaces/ISoulboundNFT.sol";
import { IERC5192 } from "../interfaces/IERC5192.sol";
import { NFT__TransferDisabled, NFT__NotAuthorized, NFT__AlreadyMinted } from "../utils/Errors.sol";
import { SoulboundNFTMinted } from "../utils/Events.sol";

/// @title SoulboundNFT
/// @notice Non-transferable ERC-721 minted to middlemen at deal resolution.
///         Each resolved deal mints one token, building cumulative on-chain reputation.
/// @dev Transfer restriction uses the OZ v5 `_update()` chokepoint — every token movement
///      (transferFrom, safeTransferFrom, _transfer, _burn) flows through it.
///      Only minting (from == address(0)) is allowed; transfers and burns revert.
///      Compliant with ERC-5192 (Minimal Soulbound NFTs).
contract SoulboundNFT is ERC721, ISoulboundNFT, IERC5192 {
    /// @notice The Escrow contract authorized to mint reputation tokens
    address public immutable escrow;

    /// @dev Next token ID to mint (starts at 1, auto-increments)
    uint256 private _nextTokenId = 1;

    /// @dev Maps tokenId to the deal it represents
    mapping(uint256 tokenId => uint256 dealId) private _dealIds;

    /// @dev Tracks whether a token has been minted for a specific deal + recipient
    mapping(uint256 dealId => mapping(address to => bool minted)) private _minted;

    /// @param escrow_ Address of the Escrow contract (immutable, only minter)
    constructor(address escrow_) ERC721("Blue Escrow Soulbound", "BESBT") {
        escrow = escrow_;
    }

    // ──────────────────────────────────────────────────────────────
    //  Minting
    // ──────────────────────────────────────────────────────────────

    /// @inheritdoc ISoulboundNFT
    function mint(address to, uint256 dealId) external returns (uint256 tokenId) {
        if (msg.sender != escrow) revert NFT__NotAuthorized(msg.sender);
        if (_minted[dealId][to]) revert NFT__AlreadyMinted(dealId, to);

        tokenId = _nextTokenId++;
        _dealIds[tokenId] = dealId;
        _minted[dealId][to] = true;

        _mint(to, tokenId);

        emit SoulboundNFTMinted(tokenId, to, dealId);
        emit Locked(tokenId);
    }

    // ──────────────────────────────────────────────────────────────
    //  Transfer Lock (_update chokepoint)
    // ──────────────────────────────────────────────────────────────

    /// @dev Blocks all transfers and burns. Only minting (from == address(0)) is allowed.
    ///      This is the single override that catches transferFrom, safeTransferFrom,
    ///      _transfer, and _burn — no transfer vector can bypass it.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert NFT__TransferDisabled();
        return super._update(to, tokenId, auth);
    }

    /// @dev Approvals are disabled — soulbound tokens cannot be transferred.
    function approve(address, uint256) public pure override {
        revert NFT__TransferDisabled();
    }

    /// @dev Operator approvals are disabled — soulbound tokens cannot be transferred.
    function setApprovalForAll(address, bool) public pure override {
        revert NFT__TransferDisabled();
    }

    // ──────────────────────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────────────────────

    /// @inheritdoc ISoulboundNFT
    function getDealId(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _dealIds[tokenId];
    }

    /// @inheritdoc ISoulboundNFT
    function getTotalDeals(address middleman) external view returns (uint256) {
        return balanceOf(middleman);
    }

    /// @inheritdoc IERC5192
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    // ──────────────────────────────────────────────────────────────
    //  ERC-165 Interface Detection
    // ──────────────────────────────────────────────────────────────

    /// @dev Supports IERC721, IERC165, IERC5192, and ISoulboundNFT.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IERC5192).interfaceId
            || interfaceId == type(ISoulboundNFT).interfaceId
            || super.supportsInterface(interfaceId);
    }
}
