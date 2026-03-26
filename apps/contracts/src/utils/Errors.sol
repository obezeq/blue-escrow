// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { DealState, ParticipantRole } from "../types/DataTypes.sol";

/// @title Errors
/// @notice Custom error definitions for the Blue Escrow protocol
/// @dev Follows Cyfrin convention: ContractName__ErrorName(). Parameters included for off-chain debugging.

// ──────────────────────────────────────────────────────────────
//  Escrow Errors
// ──────────────────────────────────────────────────────────────

/// @notice Deal is not in the required state for this action
error Escrow__InvalidState(DealState current, DealState expected);

/// @notice Caller is not a participant of the deal
error Escrow__NotParticipant(address caller, uint256 dealId);

/// @notice Caller is not the client of this deal
error Escrow__NotClient();

/// @notice Caller is not the seller of this deal
error Escrow__NotSeller();

/// @notice Caller is not the middleman of this deal
error Escrow__NotMiddleman();

/// @notice Deal with this ID does not exist
error Escrow__DealNotFound(uint256 dealId);

/// @notice The participant slot is already occupied
error Escrow__SlotAlreadyFilled(uint256 dealId, ParticipantRole role);

/// @notice This participant has already signed the deal
error Escrow__AlreadySigned(uint256 dealId, address signer);

/// @notice Ownership renunciation is permanently disabled
error Escrow__RenounceDisabled();

/// @notice The deal deadline has not been reached yet
error Escrow__TimeoutNotReached(uint256 deadline, uint256 currentTimestamp);

/// @notice The deal deadline has already passed
error Escrow__TimeoutReached(uint256 dealId);

/// @notice Zero address provided where a valid address is required
error Escrow__ZeroAddress();

/// @notice Amount must be greater than zero
error Escrow__InvalidAmount();

/// @notice A participant cannot hold multiple roles in the same deal
error Escrow__SelfDeal();

/// @notice Middleman passed an invalid resolution type
error Escrow__InvalidResolution();

/// @notice Deal cannot be cancelled in its current state
error Escrow__DealNotCancellable(uint256 dealId);

/// @notice Caller has no pending balance to withdraw
error Escrow__NothingToWithdraw();

/// @notice ERC-20 token is not on the allowed list
error Escrow__TokenNotAllowed(address token);

/// @notice Caller is not the creator of this deal
error Escrow__NotCreator(address caller, uint256 dealId);

/// @notice Platform fee exceeds the maximum allowed
error Escrow__FeeTooHigh(uint16 fee, uint16 maxFee);

/// @notice Combined platform fee + middleman commission exceeds 100%
error Escrow__FeeCombinedTooHigh(uint16 combined, uint16 max);

/// @notice Timeout duration is below the minimum allowed
error Escrow__InvalidTimeout(uint48 timeout, uint48 minTimeout);

// ──────────────────────────────────────────────────────────────
//  Registry Errors
// ──────────────────────────────────────────────────────────────

/// @notice Middleman is already registered
error Registry__AlreadyRegistered(address middleman);

/// @notice Address is not a registered middleman
error Registry__NotRegistered(address middleman);

/// @notice Commission exceeds the maximum allowed basis points
error Registry__InvalidCommission(uint16 commission);

/// @notice Ownership renunciation is permanently disabled
error Registry__RenounceDisabled();

// ──────────────────────────────────────────────────────────────
//  NFT Errors
// ──────────────────────────────────────────────────────────────

/// @notice Soulbound tokens cannot be transferred
error NFT__TransferDisabled();

/// @notice Caller is not authorized to perform this action
error NFT__NotAuthorized(address caller);

/// @notice An NFT has already been minted for this deal and recipient
error NFT__AlreadyMinted(uint256 dealId, address to);

/// @notice Zero address provided for escrow in NFT constructor
error NFT__ZeroAddress();
