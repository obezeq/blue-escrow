// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.34;

/// @title IERC5192 — Minimal Soulbound NFTs
/// @notice EIP-5192: tokens report whether they are locked (non-transferable).
/// @dev Interface ID: 0xb45a3c0e
///      See https://eips.ethereum.org/EIPS/eip-5192
interface IERC5192 {
    /// @notice Emitted when the locking status of a token changes to locked.
    /// @dev MUST be emitted when a token is minted in a locked state.
    /// @param tokenId The identifier of the token that was locked.
    event Locked(uint256 tokenId);

    /// @notice Emitted when the locking status of a token changes to unlocked.
    /// @param tokenId The identifier of the token that was unlocked.
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of a Soulbound Token.
    /// @dev MUST revert if the token does not exist.
    /// @param tokenId The identifier of the token to query.
    /// @return True if the token is locked, false otherwise.
    function locked(uint256 tokenId) external view returns (bool);
}
