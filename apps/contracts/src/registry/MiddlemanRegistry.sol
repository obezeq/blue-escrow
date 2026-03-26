// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { IMiddlemanRegistry } from "../interfaces/IMiddlemanRegistry.sol";
import {
    Registry__AlreadyRegistered,
    Registry__NotRegistered,
    Registry__InvalidCommission
} from "../utils/Errors.sol";
import { MiddlemanRegistered, MiddlemanUnregistered, CommissionUpdated } from "../utils/Events.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title MiddlemanRegistry
/// @notice Self-sovereign middleman registration with capped commission rates.
/// @dev Any address can register as a middleman. Commission is in basis points (max 50%).
///      Inherits Ownable2Step for future admin features and ERC-165 for interface detection.
///
///      Storage layout:
///        Slot 0: address _owner           (Ownable)
///        Slot 1: address _pendingOwner    (Ownable2Step)
///        Slot 2: uint256 _middlemanCount
///        Slot 3: mapping(address => MiddlemanInfo) _middlemen
contract MiddlemanRegistry is IMiddlemanRegistry, ERC165, Ownable2Step {
    // ──────────────────────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────────────────────

    /// @dev Packed into a single storage slot (3 bytes used, 29 free).
    struct MiddlemanInfo {
        bool isRegistered;
        uint16 commissionBps;
    }

    // ──────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────

    /// @dev Maximum commission: 50% (5000 bps). Protects deal participants from excessive fees.
    uint16 internal constant MAX_COMMISSION_BPS = 5000;

    // ──────────────────────────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────────────────────────

    /// @dev Number of currently registered middlemen.
    uint256 private _middlemanCount;

    /// @dev Per-address registration state and commission rate.
    mapping(address middleman => MiddlemanInfo) private _middlemen;

    // ──────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────

    /// @param owner_ Initial contract owner (multisig on mainnet). Ownable reverts on address(0).
    constructor(address owner_) Ownable(owner_) { }

    // ──────────────────────────────────────────────────────────────
    //  External — Mutating
    // ──────────────────────────────────────────────────────────────

    /// @inheritdoc IMiddlemanRegistry
    function register(uint16 commissionBps) external {
        if (_middlemen[msg.sender].isRegistered) {
            revert Registry__AlreadyRegistered(msg.sender);
        }
        if (commissionBps > MAX_COMMISSION_BPS) {
            revert Registry__InvalidCommission(commissionBps);
        }

        _middlemen[msg.sender] = MiddlemanInfo({ isRegistered: true, commissionBps: commissionBps });
        ++_middlemanCount;

        emit MiddlemanRegistered(msg.sender, commissionBps);
    }

    /// @inheritdoc IMiddlemanRegistry
    function unregister() external {
        if (!_middlemen[msg.sender].isRegistered) {
            revert Registry__NotRegistered(msg.sender);
        }

        delete _middlemen[msg.sender];
        --_middlemanCount;

        emit MiddlemanUnregistered(msg.sender);
    }

    /// @inheritdoc IMiddlemanRegistry
    function setCommission(uint16 newCommissionBps) external {
        MiddlemanInfo storage info = _middlemen[msg.sender];

        if (!info.isRegistered) {
            revert Registry__NotRegistered(msg.sender);
        }
        if (newCommissionBps > MAX_COMMISSION_BPS) {
            revert Registry__InvalidCommission(newCommissionBps);
        }

        uint16 oldCommission = info.commissionBps;
        info.commissionBps = newCommissionBps;

        emit CommissionUpdated(msg.sender, oldCommission, newCommissionBps);
    }

    // ──────────────────────────────────────────────────────────────
    //  External — View
    // ──────────────────────────────────────────────────────────────

    /// @inheritdoc IMiddlemanRegistry
    function isRegistered(address middleman) external view returns (bool) {
        return _middlemen[middleman].isRegistered;
    }

    /// @inheritdoc IMiddlemanRegistry
    function getCommission(address middleman) external view returns (uint16) {
        if (!_middlemen[middleman].isRegistered) {
            revert Registry__NotRegistered(middleman);
        }
        return _middlemen[middleman].commissionBps;
    }

    /// @inheritdoc IMiddlemanRegistry
    function getMiddlemanCount() external view returns (uint256) {
        return _middlemanCount;
    }

    // ──────────────────────────────────────────────────────────────
    //  ERC-165
    // ──────────────────────────────────────────────────────────────

    /// @dev Returns true for IMiddlemanRegistry and IERC165.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IMiddlemanRegistry).interfaceId || super.supportsInterface(interfaceId);
    }
}
