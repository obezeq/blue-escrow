// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { DealState } from "../types/DataTypes.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title DealLib
/// @notice Pure library for deal state transitions, fee calculations, and timeout checks
/// @dev All functions are internal pure — they get inlined into the calling contract at compile time.
library DealLib {
    /// @dev Number of states in the DealState enum.
    uint256 private constant _NUM_STATES = 9;

    /// @dev Basis points denominator: 10_000 = 100%.
    uint256 private constant _BPS_DENOMINATOR = 10_000;

    /// @dev Bitmask encoding all valid state transitions.
    ///      Bit position = uint8(from) * _NUM_STATES + uint8(to).
    ///
    ///      Valid transitions:
    ///        Created(0)           → Joined(1)            [bit  1]
    ///        Joined(1)            → Signed(2)            [bit 11]
    ///        Signed(2)            → Funded(3)            [bit 21]
    ///        Funded(3)            → DeliveryConfirmed(4) [bit 31]
    ///        Funded(3)            → RefundRequested(5)   [bit 32]
    ///        Funded(3)            → TimedOut(8)          [bit 35]
    ///        DeliveryConfirmed(4) → Resolved(7)          [bit 43]
    ///        RefundRequested(5)   → Disputed(6)          [bit 51]
    ///        RefundRequested(5)   → Resolved(7)          [bit 52]
    ///        RefundRequested(5)   → TimedOut(8)          [bit 53]
    ///        Disputed(6)          → Resolved(7)          [bit 61]
    ///        Disputed(6)          → TimedOut(8)          [bit 62]
    uint256 private constant _VALID_TRANSITIONS = 0x6038080980200802;

    /// @notice Check whether a state transition is valid in the deal lifecycle
    /// @dev O(1) bitmask lookup — ~50 gas. Self-transitions always return false.
    ///      Out-of-range enum values are impossible in Solidity 0.8+ (ABI decoder reverts).
    /// @param current The deal's current state
    /// @param next The proposed new state
    /// @return isValid True if the transition is allowed
    function validateStateTransition(DealState current, DealState next) internal pure returns (bool isValid) {
        uint256 bit = uint256(current) * _NUM_STATES + uint256(next);
        isValid = (_VALID_TRANSITIONS >> bit) & 1 != 0;
    }

    /// @notice Calculate the platform fee for a given deal amount
    /// @dev Uses OpenZeppelin Math.mulDiv for 512-bit intermediate precision.
    ///      Rounds down (floor) — the protocol never overcharges.
    /// @param amount The deal amount in token units
    /// @param feeBps The platform fee in basis points (e.g., 33 = 0.33%)
    /// @return fee The calculated platform fee in token units
    function calculatePlatformFee(uint256 amount, uint256 feeBps) internal pure returns (uint256 fee) {
        fee = Math.mulDiv(amount, feeBps, _BPS_DENOMINATOR);
    }

    /// @notice Calculate the middleman commission for a given deal amount
    /// @dev Uses OpenZeppelin Math.mulDiv for 512-bit intermediate precision.
    ///      Rounds down (floor) — never overcharges the deal amount.
    /// @param amount The deal amount in token units
    /// @param commissionBps The middleman's commission in basis points
    /// @return fee The calculated middleman fee in token units
    function calculateMiddlemanFee(uint256 amount, uint256 commissionBps) internal pure returns (uint256 fee) {
        fee = Math.mulDiv(amount, commissionBps, _BPS_DENOMINATOR);
    }

    /// @notice Check whether a deal's deadline has passed
    /// @dev Pure function — caller must pass block.timestamp explicitly.
    ///      Returns false when deadline is 0 (deal not yet signed, no deadline set).
    ///      Uses strict > (not >=): the deadline block itself is still valid for actions.
    /// @param deadline The absolute timestamp when the deal expires (Deal.deadline)
    /// @param currentTimestamp The current block timestamp (pass block.timestamp)
    /// @return passed True if the deadline is set and has been exceeded
    function isDeadlinePassed(uint256 deadline, uint256 currentTimestamp) internal pure returns (bool passed) {
        passed = deadline != 0 && currentTimestamp > deadline;
    }
}
