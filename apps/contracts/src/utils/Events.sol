// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { ResolutionType, ParticipantRole } from "../types/DataTypes.sol";

/// @title Events
/// @notice Event definitions for the Blue Escrow protocol
/// @dev Indexed parameters are chosen for off-chain filtering: dealId (always), addresses (for "my deals"), resolution type.

// ──────────────────────────────────────────────────────────────
//  Deal Lifecycle Events
// ──────────────────────────────────────────────────────────────

/// @notice Emitted when a new deal is created
/// @param dealId Unique deal identifier
/// @param creator Address that created the deal
/// @param client Client (buyer) address — address(0) if slot is empty
/// @param seller Seller address — address(0) if slot is empty
/// @param middleman Middleman address — address(0) if slot is empty
/// @param paymentToken ERC-20 token used for payment
/// @param amount Deal amount in token units
event DealCreated(
    uint256 indexed dealId,
    address indexed creator,
    address client,
    address seller,
    address middleman,
    address paymentToken,
    uint96 amount
);

/// @notice Emitted when a participant joins an empty slot
/// @param dealId Deal being joined
/// @param participant Address that joined
/// @param role Role the participant filled
event DealJoined(uint256 indexed dealId, address indexed participant, ParticipantRole role);

/// @notice Emitted when a participant signs the deal terms
/// @param dealId Deal being signed
/// @param signer Address that signed
event DealSigned(uint256 indexed dealId, address indexed signer);

/// @notice Emitted when all three participants have signed
/// @param dealId Deal that is now fully signed
/// @param deadline Absolute timestamp after which timeout can be executed
event DealFullySigned(uint256 indexed dealId, uint48 deadline);

/// @notice Emitted when the client deposits funds into the contract
/// @param dealId Deal being funded
/// @param funder Address that deposited (client)
/// @param amount Amount deposited in token units
event DealFunded(uint256 indexed dealId, address indexed funder, uint96 amount);

/// @notice Emitted when the client confirms delivery of goods/services
/// @param dealId Deal where delivery was confirmed
/// @param confirmer Address that confirmed (client)
event DeliveryConfirmed(uint256 indexed dealId, address indexed confirmer);

/// @notice Emitted when the client requests a refund
/// @param dealId Deal where refund was requested
/// @param requester Address that requested (client)
event RefundRequested(uint256 indexed dealId, address indexed requester);

/// @notice Emitted when the seller accepts a refund request
/// @param dealId Deal where refund was accepted
event RefundAccepted(uint256 indexed dealId);

/// @notice Emitted when the seller rejects a refund, escalating to dispute
/// @param dealId Deal entering dispute state
event DealDisputed(uint256 indexed dealId);

/// @notice Emitted when a deal is resolved and funds are distributed
/// @param dealId Deal that was resolved
/// @param resolution How the deal was resolved
/// @param clientAmount Amount sent to client (zero if seller gets all)
/// @param sellerAmount Amount sent to seller (zero if client gets all)
event DealResolved(
    uint256 indexed dealId, ResolutionType indexed resolution, uint96 clientAmount, uint96 sellerAmount
);

/// @notice Emitted when the deal amount is increased after funding
/// @param dealId Deal with increased amount
/// @param oldAmount Previous amount
/// @param newAmount New total amount
event AmountIncreased(uint256 indexed dealId, uint96 oldAmount, uint96 newAmount);

/// @notice Emitted when an increase proposal is cancelled by the proposer
/// @param dealId Deal whose increase proposal was cancelled
/// @param canceller Address that cancelled the proposal
event IncreaseProposalCancelled(uint256 indexed dealId, address indexed canceller);

/// @notice Emitted when a deal is resolved via timeout
/// @param dealId Deal that timed out
/// @param executor Address that triggered the timeout execution
event DealTimedOut(uint256 indexed dealId, address indexed executor);

/// @notice Emitted when a deal is cancelled by its creator
/// @param dealId Deal that was cancelled
/// @param canceller Address that cancelled the deal
event DealCancelled(uint256 indexed dealId, address indexed canceller);

/// @notice Emitted when a user withdraws their pending balance
/// @param user Address that withdrew
/// @param token ERC-20 token withdrawn
/// @param amount Amount withdrawn in token units
event Withdrawal(address indexed user, address indexed token, uint96 amount);

// ──────────────────────────────────────────────────────────────
//  Registry Events
// ──────────────────────────────────────────────────────────────

/// @notice Emitted when a middleman registers with their commission rate
/// @param middleman Address that registered
/// @param commissionBps Commission in basis points (1 bps = 0.01%)
event MiddlemanRegistered(address indexed middleman, uint16 commissionBps);

/// @notice Emitted when a middleman unregisters from the platform
/// @param middleman Address that unregistered
event MiddlemanUnregistered(address indexed middleman);

/// @notice Emitted when a middleman updates their commission rate
/// @param middleman Address that updated
/// @param oldCommission Previous commission in basis points
/// @param newCommission New commission in basis points
event CommissionUpdated(address indexed middleman, uint16 oldCommission, uint16 newCommission);

// ──────────────────────────────────────────────────────────────
//  Admin Events
// ──────────────────────────────────────────────────────────────

/// @notice Emitted when a token is added to the whitelist
/// @param token Address of the allowed ERC-20 token
event TokenAllowed(address indexed token);

/// @notice Emitted when a token is removed from the whitelist
/// @param token Address of the disallowed ERC-20 token
event TokenDisallowed(address indexed token);

/// @notice Emitted when the platform fee is updated
/// @param oldFee Previous fee in basis points
/// @param newFee New fee in basis points
event PlatformFeeUpdated(uint16 oldFee, uint16 newFee);

/// @notice Emitted when the default timeout duration is updated
/// @param oldTimeout Previous timeout in seconds
/// @param newTimeout New timeout in seconds
event DefaultTimeoutUpdated(uint48 oldTimeout, uint48 newTimeout);

/// @notice Emitted when the fee recipient address is updated
/// @param oldRecipient Previous fee recipient
/// @param newRecipient New fee recipient
event FeeRecipientUpdated(address oldRecipient, address newRecipient);

// ──────────────────────────────────────────────────────────────
//  NFT Events
// ──────────────────────────────────────────────────────────────

/// @notice Emitted when a receipt NFT is minted for a deal participant
/// @param tokenId Unique token identifier
/// @param to Recipient address (client or seller)
/// @param dealId Associated deal
event ReceiptNFTMinted(uint256 indexed tokenId, address indexed to, uint256 indexed dealId);

/// @notice Emitted when a soulbound NFT is minted for a middleman
/// @param tokenId Unique token identifier
/// @param to Recipient address (middleman)
/// @param dealId Associated deal
event SoulboundNFTMinted(uint256 indexed tokenId, address indexed to, uint256 indexed dealId);

/// @notice Emitted when an NFT mint fails during deal resolution
/// @dev Deal resolution and fund distribution proceed regardless of mint failure.
/// @param nftContract Address of the NFT contract that failed
/// @param to Intended recipient
/// @param dealId Associated deal
/// @param reason ABI-encoded revert reason
event MintFailed(address indexed nftContract, address indexed to, uint256 indexed dealId, bytes reason);
