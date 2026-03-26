// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Deal, ParticipantRole, ResolutionType } from "../types/DataTypes.sol";

/// @title IEscrow
/// @notice Interface for the Blue Escrow deal lifecycle
/// @dev All financial logic lives on-chain. The backend never touches funds.
///
///      Deal lifecycle:
///        Created → Joined → Signed → Funded → DeliveryConfirmed ──→ Resolved
///                                           → RefundRequested ────→ Resolved (seller accepts)
///                                           → RefundRequested → Disputed → Resolved (middleman decides)
///                                           → TimedOut (deadline reached)
interface IEscrow {
    // ──────────────────────────────────────────────────────────
    //  Deal Creation & Setup
    // ──────────────────────────────────────────────────────────

    /// @notice Create a new escrow deal
    /// @dev msg.sender must be one of the non-zero addresses provided.
    ///      Pass address(0) for any role to leave that slot open for someone to join later.
    /// @param client Buyer address (or address(0) for open slot)
    /// @param seller Seller address (or address(0) for open slot)
    /// @param middleman Middleman address (or address(0) for open slot)
    /// @param paymentToken ERC-20 token address for payment (e.g., USDC)
    /// @param amount Deal amount in token units (can be 0 if price not yet agreed)
    /// @param timeoutDuration Seconds until deadline after all parties sign (0 = use default)
    /// @return dealId The unique identifier of the newly created deal
    function createDeal(
        address client,
        address seller,
        address middleman,
        address paymentToken,
        uint96 amount,
        uint48 timeoutDuration
    ) external returns (uint256 dealId);

    /// @notice Join an open slot in an existing deal
    /// @dev msg.sender fills the specified role. Slot must be empty (address(0)).
    /// @param dealId The deal to join
    /// @param role The role to fill (Client, Seller, or Middleman)
    function joinDeal(uint256 dealId, ParticipantRole role) external;

    // ──────────────────────────────────────────────────────────
    //  Agreement Phase
    // ──────────────────────────────────────────────────────────

    /// @notice Sign the deal to confirm agreement on terms and price
    /// @dev Each participant signs once. When all three have signed, the deal
    ///      transitions to Signed state and the deadline is set.
    /// @param dealId The deal to sign
    function signDeal(uint256 dealId) external;

    // ──────────────────────────────────────────────────────────
    //  Funding
    // ──────────────────────────────────────────────────────────

    /// @notice Deposit the deal amount into the escrow contract
    /// @dev Only the client can fund. Requires prior ERC-20 approval.
    ///      Deal must be in Signed state.
    /// @param dealId The deal to fund
    function fundDeal(uint256 dealId) external;

    /// @notice Increase the deal amount after funding
    /// @dev Client deposits the difference. Both client and seller must agree.
    /// @param dealId The deal to increase
    /// @param newAmount The new total amount (must be greater than current)
    function increaseAmount(uint256 dealId, uint96 newAmount) external;

    // ──────────────────────────────────────────────────────────
    //  Resolution
    // ──────────────────────────────────────────────────────────

    /// @notice Client confirms receipt of goods/services
    /// @dev Transitions to DeliveryConfirmed → Resolved. Funds released to seller
    ///      minus platform fee and middleman commission.
    /// @param dealId The deal where delivery is confirmed
    function confirmDelivery(uint256 dealId) external;

    /// @notice Client requests a refund
    /// @dev Transitions to RefundRequested. Seller can accept or reject.
    /// @param dealId The deal to request refund for
    function requestRefund(uint256 dealId) external;

    /// @notice Seller accepts the refund request
    /// @dev Transitions to Resolved. Funds returned to client.
    /// @param dealId The deal where refund is accepted
    function acceptRefund(uint256 dealId) external;

    /// @notice Seller rejects the refund request, escalating to dispute
    /// @dev Transitions to Disputed. Only the middleman can resolve from here.
    /// @param dealId The deal where refund is rejected
    function rejectRefund(uint256 dealId) external;

    /// @notice Middleman resolves a disputed deal
    /// @dev Only callable by the deal's middleman when in Disputed state.
    ///      Resolution must be MiddlemanBuyer or MiddlemanSeller.
    /// @param dealId The disputed deal
    /// @param resolution The middleman's decision (MiddlemanBuyer or MiddlemanSeller)
    function resolveDispute(uint256 dealId, ResolutionType resolution) external;

    /// @notice Execute timeout on a deal past its deadline
    /// @dev Callable by anyone after the deadline has passed.
    ///      Funds are returned to the client as a safe default.
    /// @param dealId The deal to time out
    function executeTimeout(uint256 dealId) external;

    // ──────────────────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────────────────

    /// @notice Get the full deal data
    /// @param dealId The deal to query
    /// @return deal The Deal struct with all fields
    function getDeal(uint256 dealId) external view returns (Deal memory deal);

    /// @notice Get the total number of deals created
    /// @return Total deal count
    function getDealCount() external view returns (uint256);
}
