// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { Deal, DealState, DealConfig } from "../types/DataTypes.sol";
import {
    Escrow__InvalidState,
    Escrow__NotParticipant,
    Escrow__NotClient,
    Escrow__NotSeller,
    Escrow__NotMiddleman,
    Escrow__DealNotFound,
    Escrow__ZeroAddress,
    Escrow__FeeTooHigh,
    Escrow__InvalidTimeout
} from "../utils/Errors.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title EscrowBase
/// @notice Abstract base contract providing storage layout, modifiers, and config validation
///         for the Blue Escrow protocol.
/// @dev Inherits ReentrancyGuardTransient (EIP-1153 transient storage) and Ownable2Step
///      (two-step ownership transfer). Concrete Escrow contract inherits this.
///
///      Storage layout (slots 0-7):
///        Slot 0: address _owner               (Ownable)
///        Slot 1: address _pendingOwner        (Ownable2Step)
///        Slot 2: uint256 _dealCounter
///        Slot 3: DealConfig _config           (28/32 bytes packed)
///        Slot 4: mapping _deals
///        Slot 5: mapping _signatures
///        Slot 6: mapping _pendingBalances
///        Slot 7: mapping _allowedTokens
///        ReentrancyGuardTransient uses transient storage only (0 regular slots).
abstract contract EscrowBase is ReentrancyGuardTransient, Ownable2Step {
    // ──────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────

    /// @dev Maximum platform fee: 5% (500 bps). Prevents unreasonable fees even if admin is compromised.
    uint16 internal constant MAX_PLATFORM_FEE_BPS = 500;

    /// @dev Minimum timeout: 1 day. Prevents deals that expire before participants can act.
    uint48 internal constant MIN_TIMEOUT = 1 days;

    // ──────────────────────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────────────────────

    /// @dev Deal ID counter. Starts at 0; first createDeal does ++_dealCounter, so ID 1 is the first valid deal.
    ///      ID 0 is never assigned — prevents default-value bugs.
    uint256 internal _dealCounter;

    /// @dev Protocol-level configuration (fee recipient, default timeout, platform fee bps).
    DealConfig internal _config;

    /// @dev All deals indexed by unique ID.
    mapping(uint256 dealId => Deal) internal _deals;

    /// @dev Tracks which participants have signed each deal.
    mapping(uint256 dealId => mapping(address signer => bool)) internal _signatures;

    /// @dev Pending withdrawal balances per user per token (pull-over-push pattern).
    mapping(address user => mapping(address token => uint96)) internal _pendingBalances;

    /// @dev Whitelist of ERC-20 tokens allowed for new deals.
    mapping(address token => bool) internal _allowedTokens;

    // ──────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────

    /// @param owner_ Initial contract owner (multisig on mainnet). Ownable reverts on address(0).
    /// @param config_ Protocol configuration — validated before storage.
    constructor(address owner_, DealConfig memory config_) Ownable(owner_) {
        _validateConfig(config_);
        _config = config_;
    }

    // ──────────────────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────────────────

    /// @dev Reverts if dealId is 0 or exceeds the counter (deal does not exist).
    modifier dealExists(uint256 dealId) {
        _checkDealExists(dealId);
        _;
    }

    /// @dev Reverts if the deal is not in the expected state.
    modifier onlyInState(uint256 dealId, DealState expected) {
        _checkState(dealId, expected);
        _;
    }

    /// @dev Reverts if msg.sender is not the client, seller, or middleman of the deal.
    modifier onlyParticipant(uint256 dealId) {
        _checkParticipant(dealId);
        _;
    }

    /// @dev Reverts if msg.sender is not the deal's client.
    modifier onlyClient(uint256 dealId) {
        _checkClient(dealId);
        _;
    }

    /// @dev Reverts if msg.sender is not the deal's seller.
    modifier onlySeller(uint256 dealId) {
        _checkSeller(dealId);
        _;
    }

    /// @dev Reverts if msg.sender is not the deal's middleman.
    modifier onlyMiddleman(uint256 dealId) {
        _checkMiddleman(dealId);
        _;
    }

    // ──────────────────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────────────────

    /// @notice Get a storage pointer to a deal, reverting if it does not exist
    /// @dev Returns storage reference — callers pay only for the specific slots they read.
    /// @param dealId The deal to retrieve
    /// @return deal Storage pointer to the Deal struct
    function _getDeal(uint256 dealId) internal view returns (Deal storage deal) {
        _checkDealExists(dealId);
        deal = _deals[dealId];
    }

    /// @notice Validate protocol configuration parameters
    /// @dev Called by constructor and admin config-update functions.
    /// @param config_ The configuration to validate
    function _validateConfig(DealConfig memory config_) internal pure {
        if (config_.feeRecipient == address(0)) revert Escrow__ZeroAddress();
        if (config_.platformFeeBps > MAX_PLATFORM_FEE_BPS) {
            revert Escrow__FeeTooHigh(config_.platformFeeBps, MAX_PLATFORM_FEE_BPS);
        }
        if (config_.defaultTimeout < MIN_TIMEOUT) {
            revert Escrow__InvalidTimeout(config_.defaultTimeout, MIN_TIMEOUT);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Private Modifier Logic (reduces deployed bytecode)
    // ──────────────────────────────────────────────────────────

    function _checkDealExists(uint256 dealId) private view {
        if (dealId == 0 || dealId > _dealCounter) revert Escrow__DealNotFound(dealId);
    }

    function _checkState(uint256 dealId, DealState expected) private view {
        DealState current = _deals[dealId].state;
        if (current != expected) revert Escrow__InvalidState(current, expected);
    }

    function _checkParticipant(uint256 dealId) private view {
        Deal storage deal = _deals[dealId];
        if (msg.sender != deal.client && msg.sender != deal.seller && msg.sender != deal.middleman) {
            revert Escrow__NotParticipant(msg.sender, dealId);
        }
    }

    function _checkClient(uint256 dealId) private view {
        if (msg.sender != _deals[dealId].client) revert Escrow__NotClient();
    }

    function _checkSeller(uint256 dealId) private view {
        if (msg.sender != _deals[dealId].seller) revert Escrow__NotSeller();
    }

    function _checkMiddleman(uint256 dealId) private view {
        if (msg.sender != _deals[dealId].middleman) revert Escrow__NotMiddleman();
    }
}
