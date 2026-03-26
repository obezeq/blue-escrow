// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title IMiddlemanRegistry
/// @notice Interface for the middleman registration and commission management system
/// @dev Any address can register as a middleman with a custom commission rate.
///      Commission is expressed in basis points (1 bps = 0.01%, 10000 bps = 100%).
interface IMiddlemanRegistry {
    /// @notice Register the caller as a middleman with the given commission rate
    /// @param commissionBps Commission in basis points (must be <= max allowed)
    function register(uint16 commissionBps) external;

    /// @notice Unregister the caller as a middleman
    /// @dev Reverts if the caller is not currently registered
    function unregister() external;

    /// @notice Update the caller's commission rate
    /// @param newCommissionBps New commission in basis points
    function setCommission(uint16 newCommissionBps) external;

    /// @notice Check if an address is a registered middleman
    /// @param middleman Address to check
    /// @return True if the address is registered
    function isRegistered(address middleman) external view returns (bool);

    /// @notice Get the commission rate of a registered middleman
    /// @param middleman Address of the middleman
    /// @return Commission in basis points
    function getCommission(address middleman) external view returns (uint16);

    /// @notice Get the total number of registered middlemen
    /// @return Count of currently registered middlemen
    function getMiddlemanCount() external view returns (uint256);
}
