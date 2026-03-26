// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @title DataTypes
/// @notice Shared type definitions for the Blue Escrow protocol
/// @dev Structs are storage-packed for gas efficiency. See slot layout comments.

/// @notice Lifecycle states of an escrow deal
enum DealState {
    Created, // Deal created, slots may be empty
    Joined, // All participant slots filled
    Signed, // All parties signed — price and terms agreed
    Funded, // Client deposited funds to contract
    DeliveryConfirmed, // Client confirmed receipt of goods/services
    RefundRequested, // Client requested a refund
    Disputed, // Seller rejected refund — middleman must resolve
    Resolved, // Deal finalized — funds distributed
    TimedOut // Deadline reached — timeout executed

}

/// @notice How a deal was resolved
/// @dev None is the default (zero value) for unresolved deals
enum ResolutionType {
    None, // Not yet resolved
    Delivery, // Client confirmed delivery → funds to seller
    Refund, // Seller accepted refund → funds to client
    MiddlemanBuyer, // Middleman ruled for client → funds to client
    MiddlemanSeller, // Middleman ruled for seller → funds to seller
    Timeout // Deadline reached → funds to client

}

/// @notice Roles within a deal
enum ParticipantRole {
    Client,
    Seller,
    Middleman
}

/// @notice Core deal data, storage-packed into 5 EVM slots
/// @dev Field order matters — adjacent small types share slots.
///
/// Slot layout:
///   Slot 0: uint256 id                                                          (32/32)
///   Slot 1: address client (20) + uint96 amount (12)                            (32/32)
///   Slot 2: address seller (20) + uint48 createdAt (6) + uint48 deadline (6)    (32/32)
///   Slot 3: address middleman (20) + uint16 middlemanCommissionBps (2)
///           + uint16 platformFeeBps (2) + DealState state (1)
///           + ResolutionType resolution (1) + [6 free]                          (26/32)
///   Slot 4: address paymentToken (20) + [12 free]                               (20/32)
struct Deal {
    // --- Slot 0 ---
    uint256 id;
    // --- Slot 1 ---
    address client;
    uint96 amount;
    // --- Slot 2 ---
    address seller;
    uint48 createdAt;
    uint48 deadline;
    // --- Slot 3 ---
    address middleman;
    uint16 middlemanCommissionBps;
    uint16 platformFeeBps;
    DealState state;
    ResolutionType resolution;
    // --- Slot 4 ---
    address paymentToken;
}

/// @notice Protocol-level configuration
/// @dev Packed into 1 EVM slot: address (20) + uint48 (6) + uint16 (2) = 28 bytes
struct DealConfig {
    address feeRecipient;
    uint48 defaultTimeout;
    uint16 platformFeeBps;
}
