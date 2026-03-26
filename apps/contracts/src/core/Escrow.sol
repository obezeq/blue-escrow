// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { EscrowBase } from "../abstract/EscrowBase.sol";
import { IEscrow } from "../interfaces/IEscrow.sol";
import { IMiddlemanRegistry } from "../interfaces/IMiddlemanRegistry.sol";
import { ISoulboundNFT } from "../interfaces/ISoulboundNFT.sol";
import { IReceiptNFT } from "../interfaces/IReceiptNFT.sol";
import {
    Deal,
    DealState,
    DealConfig,
    ResolutionType,
    ParticipantRole,
    IncreaseProposal
} from "../types/DataTypes.sol";
import { DealLib } from "../libraries/DealLib.sol";
import {
    Escrow__NotParticipant,
    Escrow__SlotAlreadyFilled,
    Escrow__AlreadySigned,
    Escrow__TimeoutNotReached,
    Escrow__TimeoutReached,
    Escrow__ZeroAddress,
    Escrow__InvalidAmount,
    Escrow__SelfDeal,
    Escrow__InvalidResolution,
    Escrow__DealNotCancellable,
    Escrow__NothingToWithdraw,
    Escrow__TokenNotAllowed,
    Escrow__NotCreator,
    Escrow__InvalidState,
    Escrow__InvalidTimeout,
    Escrow__FeeCombinedTooHigh,
    Escrow__NoActiveProposal,
    Registry__NotRegistered
} from "../utils/Errors.sol";
import {
    DealCreated,
    DealJoined,
    DealSigned,
    DealFullySigned,
    DealFunded,
    DeliveryConfirmed,
    RefundRequested,
    RefundAccepted,
    DealDisputed,
    DealResolved,
    AmountIncreased,
    DealTimedOut,
    DealCancelled,
    Withdrawal,
    TokenAllowed,
    TokenDisallowed,
    MintFailed,
    IncreaseProposalCancelled
} from "../utils/Events.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Escrow
/// @notice Core escrow contract for the Blue Escrow protocol. Holds funds,
///         manages the deal lifecycle, distributes fees, and mints NFTs.
/// @dev Security model:
///      - ReentrancyGuardTransient (EIP-1153) on ALL state-changing externals
///      - SafeERC20 for ALL token transfers
///      - CEI pattern: state updates before external calls
///      - Pull-over-push: _resolveDeal credits _pendingBalances; withdraw() transfers
///      - Token whitelist prevents malicious tokens
///      - Combined fee cap: platformFeeBps + middlemanCommissionBps < 10_000
contract Escrow is EscrowBase, IEscrow {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────

    /// @dev Combined platform fee + middleman commission must be strictly less than 100%.
    uint16 internal constant MAX_COMBINED_FEE_BPS = 10_000;

    // ──────────────────────────────────────────────────────────────
    //  Immutable External Contracts
    // ──────────────────────────────────────────────────────────────

    IMiddlemanRegistry public immutable middlemanRegistry;
    ISoulboundNFT public immutable soulboundNFT;
    IReceiptNFT public immutable receiptNFT;

    // ──────────────────────────────────────────────────────────────
    //  Additional Storage
    // ──────────────────────────────────────────────────────────────

    /// @dev Pending amount increase proposals (dual-consent).
    mapping(uint256 dealId => IncreaseProposal) private _increaseProposals;

    /// @dev Array of all tokens ever whitelisted (for withdraw enumeration).
    ///      Removed tokens remain in the list — users may still have pending balances.
    address[] private _tokenList;

    /// @dev Tracks whether a token has ever been pushed to _tokenList (never cleared).
    ///      Prevents duplicate entries after removeAllowedToken + re-add.
    mapping(address token => bool) private _tokenInList;

    // ──────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────

    /// @param owner_ Initial owner (multisig on mainnet)
    /// @param config_ Protocol config (feeRecipient, defaultTimeout, platformFeeBps)
    /// @param middlemanRegistry_ MiddlemanRegistry contract address
    /// @param soulboundNFT_ SoulboundNFT contract address
    /// @param receiptNFT_ ReceiptNFT contract address
    constructor(
        address owner_,
        DealConfig memory config_,
        address middlemanRegistry_,
        address soulboundNFT_,
        address receiptNFT_
    ) EscrowBase(owner_, config_) {
        if (middlemanRegistry_ == address(0)) revert Escrow__ZeroAddress();
        if (soulboundNFT_ == address(0)) revert Escrow__ZeroAddress();
        if (receiptNFT_ == address(0)) revert Escrow__ZeroAddress();

        middlemanRegistry = IMiddlemanRegistry(middlemanRegistry_);
        soulboundNFT = ISoulboundNFT(soulboundNFT_);
        receiptNFT = IReceiptNFT(receiptNFT_);
    }

    // ══════════════════════════════════════════════════════════════
    //  Deal Creation & Setup
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function createDeal(
        address client_,
        address seller_,
        address middleman_,
        address paymentToken,
        uint96 amount,
        uint48 timeoutDuration
    ) external nonReentrant returns (uint256 dealId) {
        // --- Checks ---
        if (paymentToken == address(0)) revert Escrow__ZeroAddress();
        if (!_allowedTokens[paymentToken]) revert Escrow__TokenNotAllowed(paymentToken);
        if (amount == 0) revert Escrow__InvalidAmount();

        // msg.sender must be one of the non-zero addresses
        bool isParticipant = (client_ != address(0) && msg.sender == client_)
            || (seller_ != address(0) && msg.sender == seller_)
            || (middleman_ != address(0) && msg.sender == middleman_);
        if (!isParticipant) revert Escrow__NotParticipant(msg.sender, 0);

        // Self-deal prevention: no two non-zero addresses may be equal
        _checkSelfDeal(client_, seller_, middleman_);

        // Middleman registration + combined fee validation
        uint16 commissionBps;
        if (middleman_ != address(0)) {
            if (!middlemanRegistry.isRegistered(middleman_)) {
                revert Registry__NotRegistered(middleman_);
            }
            commissionBps = middlemanRegistry.getCommission(middleman_);
            uint16 combined = _config.platformFeeBps + commissionBps;
            if (combined >= MAX_COMBINED_FEE_BPS) {
                revert Escrow__FeeCombinedTooHigh(combined, MAX_COMBINED_FEE_BPS);
            }
        }

        // Timeout validation
        uint48 timeout = timeoutDuration == 0 ? _config.defaultTimeout : timeoutDuration;
        if (timeout < MIN_TIMEOUT) revert Escrow__InvalidTimeout(timeout, MIN_TIMEOUT);

        // --- Effects ---
        dealId = ++_dealCounter;

        // Determine initial state
        bool allFilled = client_ != address(0) && seller_ != address(0) && middleman_ != address(0);
        DealState initialState = allFilled ? DealState.Joined : DealState.Created;

        _deals[dealId] = Deal({
            id: dealId,
            client: client_,
            amount: amount,
            seller: seller_,
            createdAt: uint48(block.timestamp),
            deadline: timeout, // stores DURATION until signing converts it to absolute
            middleman: middleman_,
            middlemanCommissionBps: commissionBps,
            platformFeeBps: _config.platformFeeBps,
            state: initialState,
            resolution: ResolutionType.None,
            paymentToken: paymentToken
        });

        _dealCreators[dealId] = msg.sender;

        emit DealCreated(dealId, msg.sender, client_, seller_, middleman_, paymentToken, amount);
    }

    /// @inheritdoc IEscrow
    function joinDeal(uint256 dealId, ParticipantRole role)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Created)
    {
        Deal storage deal = _deals[dealId];

        // Check slot is empty + self-deal prevention
        if (role == ParticipantRole.Client) {
            if (deal.client != address(0)) revert Escrow__SlotAlreadyFilled(dealId, role);
            _checkNotAlreadyInDeal(deal, msg.sender);
            deal.client = msg.sender;
        } else if (role == ParticipantRole.Seller) {
            if (deal.seller != address(0)) revert Escrow__SlotAlreadyFilled(dealId, role);
            _checkNotAlreadyInDeal(deal, msg.sender);
            deal.seller = msg.sender;
        } else {
            // Middleman
            if (deal.middleman != address(0)) revert Escrow__SlotAlreadyFilled(dealId, role);
            _checkNotAlreadyInDeal(deal, msg.sender);

            if (!middlemanRegistry.isRegistered(msg.sender)) {
                revert Registry__NotRegistered(msg.sender);
            }
            deal.middleman = msg.sender;
            deal.middlemanCommissionBps = middlemanRegistry.getCommission(msg.sender);
            uint16 combined = deal.platformFeeBps + deal.middlemanCommissionBps;
            if (combined >= MAX_COMBINED_FEE_BPS) {
                revert Escrow__FeeCombinedTooHigh(combined, MAX_COMBINED_FEE_BPS);
            }
        }

        emit DealJoined(dealId, msg.sender, role);

        // Transition to Joined if all slots are now filled
        if (deal.client != address(0) && deal.seller != address(0) && deal.middleman != address(0)) {
            deal.state = DealState.Joined;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Cancellation
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function cancelDeal(uint256 dealId) external nonReentrant dealExists(dealId) {
        if (_dealCreators[dealId] != msg.sender) revert Escrow__NotCreator(msg.sender, dealId);

        Deal storage deal = _deals[dealId];
        if (deal.state != DealState.Created && deal.state != DealState.Joined) {
            revert Escrow__DealNotCancellable(dealId);
        }

        deal.state = DealState.Resolved;
        deal.resolution = ResolutionType.None;

        emit DealCancelled(dealId, msg.sender);
    }

    // ══════════════════════════════════════════════════════════════
    //  Agreement Phase
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function signDeal(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Joined)
        onlyParticipant(dealId)
    {
        Deal storage deal = _deals[dealId];
        if (deal.amount == 0) revert Escrow__InvalidAmount();
        if (_signatures[dealId][msg.sender]) revert Escrow__AlreadySigned(dealId, msg.sender);

        _signatures[dealId][msg.sender] = true;
        emit DealSigned(dealId, msg.sender);

        // Check if all three have signed
        if (
            _signatures[dealId][deal.client] && _signatures[dealId][deal.seller]
                && _signatures[dealId][deal.middleman]
        ) {
            deal.state = DealState.Signed;
            // Convert stored duration to absolute deadline
            deal.deadline = uint48(block.timestamp) + deal.deadline;
            emit DealFullySigned(dealId, deal.deadline);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Funding
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function fundDeal(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Signed)
        onlyClient(dealId)
    {
        Deal storage deal = _deals[dealId];
        if (DealLib.isDeadlinePassed(deal.deadline, block.timestamp)) {
            revert Escrow__TimeoutReached(dealId);
        }

        // Effects before interactions (CEI)
        deal.state = DealState.Funded;

        // Interaction: pull funds from client
        IERC20(deal.paymentToken).safeTransferFrom(msg.sender, address(this), deal.amount);

        emit DealFunded(dealId, msg.sender, deal.amount);
    }

    /// @inheritdoc IEscrow
    function increaseAmount(uint256 dealId, uint96 newAmount)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Funded)
    {
        Deal storage deal = _deals[dealId];

        // Only client or seller can propose/confirm
        if (msg.sender != deal.client && msg.sender != deal.seller) {
            revert Escrow__NotParticipant(msg.sender, dealId);
        }
        if (newAmount <= deal.amount) revert Escrow__InvalidAmount();
        if (DealLib.isDeadlinePassed(deal.deadline, block.timestamp)) {
            revert Escrow__TimeoutReached(dealId);
        }

        IncreaseProposal storage proposal = _increaseProposals[dealId];

        // If the other party already proposed the same amount → execute
        if (
            proposal.proposer != address(0) && proposal.proposer != msg.sender
                && proposal.newAmount == newAmount
        ) {
            uint96 oldAmount = deal.amount;
            uint96 difference = newAmount - oldAmount;

            // Effects
            deal.amount = newAmount;
            delete _increaseProposals[dealId];

            // Interaction: pull difference from client
            IERC20(deal.paymentToken).safeTransferFrom(deal.client, address(this), difference);

            emit AmountIncreased(dealId, oldAmount, newAmount);
        } else {
            // Record or overwrite proposal
            _increaseProposals[dealId] = IncreaseProposal({ proposer: msg.sender, newAmount: newAmount });
        }
    }

    /// @inheritdoc IEscrow
    function cancelIncreaseProposal(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Funded)
    {
        IncreaseProposal storage proposal = _increaseProposals[dealId];
        if (proposal.proposer == address(0)) revert Escrow__NoActiveProposal(dealId);
        if (proposal.proposer != msg.sender) revert Escrow__NotParticipant(msg.sender, dealId);

        delete _increaseProposals[dealId];

        emit IncreaseProposalCancelled(dealId, msg.sender);
    }

    // ══════════════════════════════════════════════════════════════
    //  Resolution
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function confirmDelivery(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Funded)
        onlyClient(dealId)
    {
        Deal storage deal = _deals[dealId];
        if (DealLib.isDeadlinePassed(deal.deadline, block.timestamp)) {
            revert Escrow__TimeoutReached(dealId);
        }

        deal.state = DealState.DeliveryConfirmed;
        emit DeliveryConfirmed(dealId, msg.sender);

        _resolveDeal(dealId, ResolutionType.Delivery);
    }

    /// @inheritdoc IEscrow
    function requestRefund(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Funded)
        onlyClient(dealId)
    {
        Deal storage deal = _deals[dealId];
        if (DealLib.isDeadlinePassed(deal.deadline, block.timestamp)) {
            revert Escrow__TimeoutReached(dealId);
        }

        deal.state = DealState.RefundRequested;
        emit RefundRequested(dealId, msg.sender);
    }

    /// @inheritdoc IEscrow
    function acceptRefund(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.RefundRequested)
        onlySeller(dealId)
    {
        emit RefundAccepted(dealId);
        _resolveDeal(dealId, ResolutionType.Refund);
    }

    /// @inheritdoc IEscrow
    function rejectRefund(uint256 dealId)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.RefundRequested)
        onlySeller(dealId)
    {
        _deals[dealId].state = DealState.Disputed;
        emit DealDisputed(dealId);
    }

    /// @inheritdoc IEscrow
    function resolveDispute(uint256 dealId, ResolutionType resolution)
        external
        nonReentrant
        dealExists(dealId)
        onlyInState(dealId, DealState.Disputed)
        onlyMiddleman(dealId)
    {
        if (resolution != ResolutionType.MiddlemanBuyer && resolution != ResolutionType.MiddlemanSeller) {
            revert Escrow__InvalidResolution();
        }

        _resolveDeal(dealId, resolution);
    }

    /// @inheritdoc IEscrow
    function executeTimeout(uint256 dealId) external nonReentrant dealExists(dealId) {
        Deal storage deal = _deals[dealId];

        // Only valid from Funded, RefundRequested, or Disputed
        if (
            deal.state != DealState.Funded && deal.state != DealState.RefundRequested
                && deal.state != DealState.Disputed
        ) {
            revert Escrow__InvalidState(deal.state, DealState.Funded);
        }

        if (!DealLib.isDeadlinePassed(deal.deadline, block.timestamp)) {
            revert Escrow__TimeoutNotReached(deal.deadline, block.timestamp);
        }

        deal.state = DealState.TimedOut;
        emit DealTimedOut(dealId, msg.sender);

        _resolveDeal(dealId, ResolutionType.Timeout);
    }

    // ══════════════════════════════════════════════════════════════
    //  Withdrawal (Pull-over-Push)
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function withdraw() external nonReentrant {
        bool transferred;
        uint256 len = _tokenList.length;

        for (uint256 i; i < len; ++i) {
            address token = _tokenList[i];
            uint96 balance = _pendingBalances[msg.sender][token];

            if (balance > 0) {
                // CEI: zero balance before transfer
                _pendingBalances[msg.sender][token] = 0;
                IERC20(token).safeTransfer(msg.sender, balance);
                emit Withdrawal(msg.sender, token, balance);
                transferred = true;
            }
        }

        if (!transferred) revert Escrow__NothingToWithdraw();
    }

    /// @inheritdoc IEscrow
    function withdrawToken(address token) external nonReentrant {
        uint96 balance = _pendingBalances[msg.sender][token];
        if (balance == 0) revert Escrow__NothingToWithdraw();

        _pendingBalances[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, balance);
        emit Withdrawal(msg.sender, token, balance);
    }

    // ══════════════════════════════════════════════════════════════
    //  Token Whitelist (Admin)
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function addAllowedToken(address token) external onlyOwner {
        if (token == address(0)) revert Escrow__ZeroAddress();
        _allowedTokens[token] = true;
        if (!_tokenInList[token]) {
            _tokenInList[token] = true;
            _tokenList.push(token);
        }
        emit TokenAllowed(token);
    }

    /// @inheritdoc IEscrow
    function removeAllowedToken(address token) external onlyOwner {
        _allowedTokens[token] = false;
        // Token stays in _tokenList — users may still have pending balances
        emit TokenDisallowed(token);
    }

    /// @inheritdoc IEscrow
    function isTokenAllowed(address token) external view returns (bool) {
        return _allowedTokens[token];
    }

    // ══════════════════════════════════════════════════════════════
    //  View Functions
    // ══════════════════════════════════════════════════════════════

    /// @inheritdoc IEscrow
    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return _getDeal(dealId);
    }

    /// @inheritdoc IEscrow
    function getDealCount() external view returns (uint256) {
        return _dealCounter;
    }

    /// @inheritdoc IEscrow
    function pendingBalance(address user, address token) external view returns (uint96) {
        return _pendingBalances[user][token];
    }

    // ══════════════════════════════════════════════════════════════
    //  Internal: Deal Resolution
    // ══════════════════════════════════════════════════════════════

    /// @dev Core fund distribution logic. Credits _pendingBalances and mints NFTs.
    ///      Called by confirmDelivery, acceptRefund, resolveDispute, executeTimeout.
    function _resolveDeal(uint256 dealId, ResolutionType resolution) internal {
        Deal storage deal = _deals[dealId];

        // Set terminal state (TimedOut is already set by executeTimeout)
        if (deal.state != DealState.TimedOut) {
            deal.state = DealState.Resolved;
        }
        deal.resolution = resolution;

        uint96 amount = deal.amount;
        address token = deal.paymentToken;

        if (resolution == ResolutionType.Delivery || resolution == ResolutionType.MiddlemanSeller) {
            // Seller wins: distribute fees
            uint256 platformFee = DealLib.calculatePlatformFee(amount, deal.platformFeeBps);
            uint256 middlemanFee = DealLib.calculateMiddlemanFee(amount, deal.middlemanCommissionBps);
            uint96 sellerPayout = uint96(uint256(amount) - platformFee - middlemanFee);

            _pendingBalances[deal.seller][token] += sellerPayout;
            _pendingBalances[deal.middleman][token] += uint96(middlemanFee);
            _pendingBalances[_config.feeRecipient][token] += uint96(platformFee);

            emit DealResolved(dealId, resolution, 0, sellerPayout);
        } else {
            // Client wins (Refund, MiddlemanBuyer, Timeout): full amount, no fees
            _pendingBalances[deal.client][token] += amount;

            emit DealResolved(dealId, resolution, amount, 0);
        }

        // Mint NFTs — try/catch ensures fund distribution is never blocked by mint failure
        try receiptNFT.mint(deal.client, dealId) {} catch (bytes memory reason) {
            emit MintFailed(address(receiptNFT), deal.client, dealId, reason);
        }
        try receiptNFT.mint(deal.seller, dealId) {} catch (bytes memory reason) {
            emit MintFailed(address(receiptNFT), deal.seller, dealId, reason);
        }
        try soulboundNFT.mint(deal.middleman, dealId) {} catch (bytes memory reason) {
            emit MintFailed(address(soulboundNFT), deal.middleman, dealId, reason);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Internal: Validation Helpers
    // ══════════════════════════════════════════════════════════════

    /// @dev Reverts if any two non-zero addresses are the same (self-deal prevention).
    function _checkSelfDeal(address a, address b, address c) internal pure {
        if (a != address(0) && b != address(0) && a == b) revert Escrow__SelfDeal();
        if (a != address(0) && c != address(0) && a == c) revert Escrow__SelfDeal();
        if (b != address(0) && c != address(0) && b == c) revert Escrow__SelfDeal();
    }

    /// @dev Reverts if addr already holds a role in the deal (for joinDeal).
    function _checkNotAlreadyInDeal(Deal storage deal, address addr) internal view {
        if (
            (deal.client != address(0) && deal.client == addr)
                || (deal.seller != address(0) && deal.seller == addr)
                || (deal.middleman != address(0) && deal.middleman == addr)
        ) {
            revert Escrow__SelfDeal();
        }
    }
}
