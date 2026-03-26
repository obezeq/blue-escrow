// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { CommonBase } from "forge-std/Base.sol";
import { StdCheats } from "forge-std/StdCheats.sol";
import { StdUtils } from "forge-std/StdUtils.sol";
import { Escrow } from "../../../src/core/Escrow.sol";
import { MiddlemanRegistry } from "../../../src/registry/MiddlemanRegistry.sol";
import { MockUSDC } from "../../mocks/MockUSDC.sol";
import { Deal, DealState, ResolutionType, ParticipantRole } from "../../../src/types/DataTypes.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title EscrowHandler
/// @notice Invariant test handler — wraps all Escrow externals with bounded inputs and ghost variable tracking.
/// @dev Extends CommonBase + StdCheats + StdUtils (not Test) to keep handler lightweight.
///      Early-returns on invalid preconditions to avoid wasting fuzzer runs.
contract EscrowHandler is CommonBase, StdCheats, StdUtils {
    // ──────────────────────────────────────────────────────────────
    //  External References
    // ──────────────────────────────────────────────────────────────

    Escrow public immutable escrow;
    MiddlemanRegistry public immutable registry;
    MockUSDC public immutable usdc;
    address public immutable feeRecipient;

    // ──────────────────────────────────────────────────────────────
    //  Fixed Actor Sets
    // ──────────────────────────────────────────────────────────────

    address[] public clients;
    address[] public sellers;
    address[] public middlemen;

    // ──────────────────────────────────────────────────────────────
    //  Ghost Variables
    // ──────────────────────────────────────────────────────────────

    uint256 public ghost_totalDeposited;
    uint256 public ghost_totalWithdrawn;
    uint256 public ghost_fundedDealAmountSum;
    uint256 public ghost_resolvedDealCount;
    uint256 public ghost_cancelledDealCount;
    uint256 public ghost_previousDealCounter;

    mapping(uint256 dealId => uint8 stateOrdinal) public ghost_dealStates;
    mapping(uint256 dealId => uint96 amount) public ghost_dealAmounts;

    // ──────────────────────────────────────────────────────────────
    //  Deal Tracking
    // ──────────────────────────────────────────────────────────────

    uint256[] internal _dealIds;
    mapping(uint256 dealId => address) public dealClients;
    mapping(uint256 dealId => address) public dealSellers;
    mapping(uint256 dealId => address) public dealMiddlemen;
    mapping(uint256 dealId => address) public dealCreators;

    // ──────────────────────────────────────────────────────────────
    //  Pending User Tracking
    // ──────────────────────────────────────────────────────────────

    address[] internal _pendingUsers;
    mapping(address => bool) internal _pendingUserSeen;

    // ──────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────

    constructor(Escrow escrow_, MiddlemanRegistry registry_, MockUSDC usdc_, address feeRecipient_) {
        escrow = escrow_;
        registry = registry_;
        usdc = usdc_;
        feeRecipient = feeRecipient_;

        // Create fixed actor sets
        for (uint256 i; i < 5; i++) {
            clients.push(makeAddr(string.concat("hClient_", vm.toString(i))));
            sellers.push(makeAddr(string.concat("hSeller_", vm.toString(i))));
        }

        uint16[3] memory commissions = [uint16(100), uint16(500), uint16(2000)];
        for (uint256 i; i < 3; i++) {
            address mm = makeAddr(string.concat("hMiddleman_", vm.toString(i)));
            middlemen.push(mm);
            vm.prank(mm);
            registry.register(commissions[i]);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Handler Functions
    // ══════════════════════════════════════════════════════════════

    /// @dev Create a deal with all 3 slots filled → Joined state
    function handler_createDeal(
        uint256 clientSeed,
        uint256 sellerSeed,
        uint256 middlemanSeed,
        uint256 amountSeed,
        uint256 timeoutSeed
    ) external {
        uint256 clientIdx = bound(clientSeed, 0, clients.length - 1);
        uint256 sellerIdx = bound(sellerSeed, 0, sellers.length - 1);
        uint256 middlemanIdx = bound(middlemanSeed, 0, middlemen.length - 1);
        uint96 amount = uint96(bound(amountSeed, 1e6, 10_000_000e6));
        uint48 timeout = uint48(bound(timeoutSeed, 1 days, 365 days));

        address c = clients[clientIdx];
        address s = sellers[sellerIdx];
        address m = middlemen[middlemanIdx];

        // Ensure distinct participants (fixed sets are separate, so collisions only if same index maps same address — they don't)
        // But guard anyway: if somehow equal, shift seller
        if (c == s || c == m || s == m) return;

        vm.prank(c);
        uint256 dealId = escrow.createDeal(c, s, m, address(usdc), amount, timeout);

        _dealIds.push(dealId);
        dealClients[dealId] = c;
        dealSellers[dealId] = s;
        dealMiddlemen[dealId] = m;
        dealCreators[dealId] = c;
        ghost_dealStates[dealId] = uint8(DealState.Joined);
        ghost_previousDealCounter = escrow.getDealCount();
    }

    /// @dev Create a deal with seller slot empty → Created state
    function handler_createDealWithOpenSlot(
        uint256 clientSeed,
        uint256 middlemanSeed,
        uint256 amountSeed,
        uint256 timeoutSeed
    ) external {
        uint256 clientIdx = bound(clientSeed, 0, clients.length - 1);
        uint256 middlemanIdx = bound(middlemanSeed, 0, middlemen.length - 1);
        uint96 amount = uint96(bound(amountSeed, 1e6, 10_000_000e6));
        uint48 timeout = uint48(bound(timeoutSeed, 1 days, 365 days));

        address c = clients[clientIdx];
        address m = middlemen[middlemanIdx];
        if (c == m) return;

        vm.prank(c);
        uint256 dealId = escrow.createDeal(c, address(0), m, address(usdc), amount, timeout);

        _dealIds.push(dealId);
        dealClients[dealId] = c;
        dealMiddlemen[dealId] = m;
        dealCreators[dealId] = c;
        ghost_dealStates[dealId] = uint8(DealState.Created);
        ghost_previousDealCounter = escrow.getDealCount();
    }

    /// @dev Fill the empty seller slot on a Created deal → may transition to Joined
    function handler_joinDeal(uint256 dealSeed, uint256 sellerSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Created);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        if (deal.seller != address(0)) return; // slot already filled

        uint256 sellerIdx = bound(sellerSeed, 0, sellers.length - 1);
        address s = sellers[sellerIdx];

        // Ensure distinct from existing participants
        if (s == deal.client || s == deal.middleman) return;

        vm.prank(s);
        escrow.joinDeal(dealId, ParticipantRole.Seller);

        dealSellers[dealId] = s;
        // All slots filled → Joined
        ghost_dealStates[dealId] = uint8(DealState.Joined);
    }

    /// @dev Cancel a deal in Created or Joined state
    function handler_cancelDeal(uint256 dealSeed) external {
        if (_dealIds.length == 0) return;
        uint256 idx = bound(dealSeed, 0, _dealIds.length - 1);
        uint256 dealId = _dealIds[idx];

        Deal memory deal = escrow.getDeal(dealId);
        if (deal.state != DealState.Created && deal.state != DealState.Joined) return;

        vm.prank(dealCreators[dealId]);
        escrow.cancelDeal(dealId);

        ghost_dealStates[dealId] = uint8(DealState.Resolved);
        ghost_cancelledDealCount++;
    }

    /// @dev Sign a deal in Joined state as a random participant
    function handler_signDeal(uint256 dealSeed, uint256 signerSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Joined);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        if (deal.amount == 0) return;

        // Pick a random signer from the 3 participants
        uint256 choice = bound(signerSeed, 0, 2);
        address signer;
        if (choice == 0) signer = deal.client;
        else if (choice == 1) signer = deal.seller;
        else signer = deal.middleman;

        vm.prank(signer);
        try escrow.signDeal(dealId) {
            // Re-read state after successful sign
            Deal memory updated = escrow.getDeal(dealId);
            ghost_dealStates[dealId] = uint8(updated.state);
        } catch {
            // AlreadySigned or other — skip
        }
    }

    /// @dev Fund a deal in Signed state — auto-mints USDC and approves
    function handler_fundDeal(uint256 dealSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Signed);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        if (block.timestamp > deal.deadline) return;

        address c = deal.client;

        // Auto-mint and approve
        usdc.mint(c, deal.amount);
        vm.startPrank(c);
        usdc.approve(address(escrow), deal.amount);
        escrow.fundDeal(dealId);
        vm.stopPrank();

        ghost_totalDeposited += deal.amount;
        ghost_fundedDealAmountSum += deal.amount;
        ghost_dealAmounts[dealId] = deal.amount;
        ghost_dealStates[dealId] = uint8(DealState.Funded);
    }

    /// @dev Increase deal amount — executes dual-consent in one call
    function handler_increaseAmount(uint256 dealSeed, uint256 increaseSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Funded);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        if (block.timestamp > deal.deadline) return;

        uint96 increase = uint96(bound(increaseSeed, 1e6, 1_000_000e6));
        // Guard against uint96 overflow
        if (uint256(deal.amount) + uint256(increase) > type(uint96).max) return;
        uint96 newAmount = deal.amount + increase;

        address c = deal.client;
        address s = deal.seller;

        // Client proposes
        vm.prank(c);
        try escrow.increaseAmount(dealId, newAmount) {} catch { return; }

        // Seller confirms — auto-mint difference to client before the transfer
        usdc.mint(c, increase);
        vm.prank(c);
        usdc.approve(address(escrow), increase);

        vm.prank(s);
        try escrow.increaseAmount(dealId, newAmount) {
            ghost_totalDeposited += increase;
            ghost_fundedDealAmountSum += increase;
            ghost_dealAmounts[dealId] = newAmount;
        } catch {
            // If second call fails, the proposal is just stored — no state change to track
        }
    }

    /// @dev Client confirms delivery → Delivery resolution
    function handler_confirmDelivery(uint256 dealSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Funded);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        if (block.timestamp > deal.deadline) return;

        vm.prank(deal.client);
        escrow.confirmDelivery(dealId);

        _trackResolution(dealId, ResolutionType.Delivery);
    }

    /// @dev Client requests refund → RefundRequested
    function handler_requestRefund(uint256 dealSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Funded);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        if (block.timestamp > deal.deadline) return;

        vm.prank(deal.client);
        escrow.requestRefund(dealId);

        ghost_dealStates[dealId] = uint8(DealState.RefundRequested);
    }

    /// @dev Seller accepts refund → Refund resolution
    function handler_acceptRefund(uint256 dealSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.RefundRequested);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        vm.prank(deal.seller);
        escrow.acceptRefund(dealId);

        _trackResolution(dealId, ResolutionType.Refund);
    }

    /// @dev Seller rejects refund → Disputed
    function handler_rejectRefund(uint256 dealSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.RefundRequested);
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);
        vm.prank(deal.seller);
        escrow.rejectRefund(dealId);

        ghost_dealStates[dealId] = uint8(DealState.Disputed);
    }

    /// @dev Middleman resolves dispute → MiddlemanBuyer or MiddlemanSeller
    function handler_resolveDispute(uint256 dealSeed, uint256 resolutionSeed) external {
        (uint256 dealId, bool found) = _findDealInState(DealState.Disputed);
        if (!found) return;

        ResolutionType resolution =
            resolutionSeed % 2 == 0 ? ResolutionType.MiddlemanBuyer : ResolutionType.MiddlemanSeller;

        Deal memory deal = escrow.getDeal(dealId);
        vm.prank(deal.middleman);
        escrow.resolveDispute(dealId, resolution);

        _trackResolution(dealId, resolution);
    }

    /// @dev Execute timeout — warps time past deadline
    function handler_executeTimeout(uint256 dealSeed) external {
        (uint256 dealId, bool found) = _findDealInStates(
            DealState.Funded, DealState.RefundRequested, DealState.Disputed
        );
        if (!found) return;

        Deal memory deal = escrow.getDeal(dealId);

        // Warp past deadline if not already there
        if (block.timestamp <= deal.deadline) {
            vm.warp(deal.deadline + 1);
        }

        escrow.executeTimeout(dealId);

        ghost_dealStates[dealId] = uint8(DealState.TimedOut);
        _trackResolution(dealId, ResolutionType.Timeout);
    }

    /// @dev Random actor withdraws pending balance
    function handler_withdraw(uint256 actorSeed) external {
        // Build union of all actors + feeRecipient
        uint256 totalActors = clients.length + sellers.length + middlemen.length + 1;
        uint256 actorIdx = bound(actorSeed, 0, totalActors - 1);

        address actor;
        if (actorIdx < clients.length) {
            actor = clients[actorIdx];
        } else if (actorIdx < clients.length + sellers.length) {
            actor = sellers[actorIdx - clients.length];
        } else if (actorIdx < clients.length + sellers.length + middlemen.length) {
            actor = middlemen[actorIdx - clients.length - sellers.length];
        } else {
            actor = feeRecipient;
        }

        uint96 balance = escrow.pendingBalance(actor, address(usdc));
        if (balance == 0) return;

        vm.prank(actor);
        escrow.withdraw();

        ghost_totalWithdrawn += balance;
    }

    // ══════════════════════════════════════════════════════════════
    //  Internal Helpers
    // ══════════════════════════════════════════════════════════════

    function _findDealInState(DealState target) internal view returns (uint256 dealId, bool found) {
        for (uint256 i; i < _dealIds.length; i++) {
            Deal memory deal = escrow.getDeal(_dealIds[i]);
            if (deal.state == target) {
                return (_dealIds[i], true);
            }
        }
        return (0, false);
    }

    function _findDealInStates(DealState a, DealState b, DealState c)
        internal
        view
        returns (uint256 dealId, bool found)
    {
        for (uint256 i; i < _dealIds.length; i++) {
            Deal memory deal = escrow.getDeal(_dealIds[i]);
            if (deal.state == a || deal.state == b || deal.state == c) {
                return (_dealIds[i], true);
            }
        }
        return (0, false);
    }

    function _trackResolution(uint256 dealId, ResolutionType resolution) internal {
        uint96 amount = ghost_dealAmounts[dealId];

        ghost_resolvedDealCount++;
        ghost_fundedDealAmountSum -= amount;

        Deal memory deal = escrow.getDeal(dealId);

        // Update state ghost — use the actual on-chain state (Resolved or TimedOut)
        ghost_dealStates[dealId] = uint8(deal.state);

        // Track all users who received pending balances
        if (resolution == ResolutionType.Delivery || resolution == ResolutionType.MiddlemanSeller) {
            _recordPendingUser(deal.seller);
            _recordPendingUser(deal.middleman);
            _recordPendingUser(feeRecipient);
        } else {
            _recordPendingUser(deal.client);
        }
    }

    function _recordPendingUser(address user) internal {
        if (!_pendingUserSeen[user]) {
            _pendingUserSeen[user] = true;
            _pendingUsers.push(user);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  View Helpers (for invariant test)
    // ══════════════════════════════════════════════════════════════

    function getDealIdsLength() external view returns (uint256) {
        return _dealIds.length;
    }

    function getDealIdAt(uint256 index) external view returns (uint256) {
        return _dealIds[index];
    }

    function getPendingUsersLength() external view returns (uint256) {
        return _pendingUsers.length;
    }

    function getPendingUserAt(uint256 index) external view returns (address) {
        return _pendingUsers[index];
    }
}
