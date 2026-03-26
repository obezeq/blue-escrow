// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title ISoulboundNFT
/// @notice Interface for non-transferable reputation NFTs minted to middlemen at deal resolution
/// @dev Extends ERC-721 with transfer restrictions. Only the Escrow contract can mint.
///      Transfers revert with NFT__TransferDisabled(). Each resolved deal mints one token,
///      building a cumulative on-chain reputation for the middleman.
interface ISoulboundNFT {
    /// @notice Mint a soulbound reputation NFT for a middleman
    /// @dev Only callable by the authorized Escrow contract.
    ///      One soulbound token per deal per middleman.
    /// @param to Middleman address
    /// @param dealId The deal this reputation token is for
    /// @return tokenId The minted token's ID
    function mint(address to, uint256 dealId) external returns (uint256 tokenId);

    /// @notice Get the deal ID associated with a soulbound token
    /// @param tokenId The token to query
    /// @return The deal ID linked to this token
    function getDealId(uint256 tokenId) external view returns (uint256);

    /// @notice Get the total number of resolved deals for a middleman
    /// @dev Equivalent to the middleman's soulbound token balance — each resolved deal = one token
    /// @param middleman Address to query
    /// @return Total soulbound tokens held (= total resolved deals)
    function getTotalDeals(address middleman) external view returns (uint256);
}
