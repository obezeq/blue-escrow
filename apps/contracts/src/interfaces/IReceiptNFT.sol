// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title IReceiptNFT
/// @notice Interface for deal receipt NFTs minted to client and seller at resolution
/// @dev Extends ERC-721. Transferable. Only the Escrow contract can mint.
interface IReceiptNFT {
    /// @notice Mint a receipt NFT for a deal participant
    /// @dev Only callable by the authorized Escrow contract.
    ///      One receipt per (dealId, participant) pair.
    /// @param to Recipient address (client or seller)
    /// @param dealId The deal this receipt is for
    /// @return tokenId The minted token's ID
    function mint(address to, uint256 dealId) external returns (uint256 tokenId);

    /// @notice Get the deal ID associated with a receipt token
    /// @param tokenId The token to query
    /// @return The deal ID linked to this receipt
    function getDealId(uint256 tokenId) external view returns (uint256);
}
