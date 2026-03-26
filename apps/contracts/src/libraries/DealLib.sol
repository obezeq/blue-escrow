// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title DealLib
/// @notice Pure library for fee calculations and timeout checks
/// @dev All functions are internal pure — they get inlined into the calling contract at compile time.
library DealLib {
    /// @dev Basis points denominator: 10_000 = 100%.
    uint256 private constant _BPS_DENOMINATOR = 10_000;

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
