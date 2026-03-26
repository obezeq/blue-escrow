// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Test } from "forge-std/Test.sol";
import { Escrow } from "../../src/core/Escrow.sol";
import { MiddlemanRegistry } from "../../src/registry/MiddlemanRegistry.sol";
import { SoulboundNFT } from "../../src/tokens/SoulboundNFT.sol";
import { ReceiptNFT } from "../../src/tokens/ReceiptNFT.sol";
import { MockUSDC } from "../mocks/MockUSDC.sol";
import { Deal, DealState, DealConfig, ResolutionType } from "../../src/types/DataTypes.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { EscrowHandler } from "./handlers/EscrowHandler.sol";

/// @title EscrowInvariant
/// @notice Stateful invariant tests for the Blue Escrow protocol (FREI-PI pattern).
///         Verifies protocol properties that must ALWAYS hold regardless of call sequence.
contract EscrowInvariant is Test {
    // ──────────────────────────────────────────────────────────────
    //  Contracts
    // ──────────────────────────────────────────────────────────────

    Escrow internal escrow;
    MiddlemanRegistry internal registry;
    SoulboundNFT internal soulbound;
    ReceiptNFT internal receipt;
    MockUSDC internal usdc;
    EscrowHandler internal handler;

    // ──────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────

    address internal owner;
    address internal feeRecipient = makeAddr("feeRecipient");
    uint16 internal constant PLATFORM_FEE_BPS = 33;
    uint48 internal constant DEFAULT_TIMEOUT = 33 days;

    // ──────────────────────────────────────────────────────────────
    //  setUp
    // ──────────────────────────────────────────────────────────────

    function setUp() public {
        owner = address(this);

        // 1. Deploy MockUSDC and MiddlemanRegistry
        usdc = new MockUSDC();
        registry = new MiddlemanRegistry(owner);

        // 2. Predict Escrow address (same pattern as unit tests)
        uint64 nonce = vm.getNonce(address(this));
        address predictedEscrow = vm.computeCreateAddress(address(this), nonce + 2);

        // 3. Deploy NFTs with predicted escrow address
        soulbound = new SoulboundNFT(predictedEscrow);
        receipt = new ReceiptNFT(predictedEscrow);

        // 4. Deploy Escrow
        DealConfig memory config =
            DealConfig({ feeRecipient: feeRecipient, defaultTimeout: DEFAULT_TIMEOUT, platformFeeBps: PLATFORM_FEE_BPS });
        escrow = new Escrow(owner, config, address(registry), address(soulbound), address(receipt));
        assertEq(address(escrow), predictedEscrow, "Escrow address prediction mismatch");

        // 5. Whitelist USDC
        escrow.addAllowedToken(address(usdc));

        // 6. Deploy handler (registers middlemen internally)
        handler = new EscrowHandler(escrow, registry, usdc, feeRecipient);

        // 7. Target only the handler
        targetContract(address(handler));

        // 8. Exclude system addresses from fuzzer's msg.sender pool
        excludeSender(address(escrow));
        excludeSender(address(registry));
        excludeSender(address(soulbound));
        excludeSender(address(receipt));
        excludeSender(address(usdc));
        excludeSender(address(handler));
        excludeSender(address(this));
    }

    // ══════════════════════════════════════════════════════════════
    //  Invariant: Solvency
    // ══════════════════════════════════════════════════════════════

    /// @dev Contract USDC balance must always cover all active (not-yet-resolved) funded deals.
    function invariant_solvency() public view {
        uint256 contractBalance = usdc.balanceOf(address(escrow));
        uint256 fundedSum = handler.ghost_fundedDealAmountSum();
        assertGe(contractBalance, fundedSum, "Solvency: contract balance < funded deal amounts");
    }

    /// @dev Sum of all pending withdrawal balances must never exceed contract balance.
    function invariant_pendingBalanceSolvency() public view {
        uint256 contractBalance = usdc.balanceOf(address(escrow));
        uint256 totalPending;

        uint256 len = handler.getPendingUsersLength();
        for (uint256 i; i < len; i++) {
            address user = handler.getPendingUserAt(i);
            totalPending += escrow.pendingBalance(user, address(usdc));
        }

        assertGe(contractBalance, totalPending, "Pending balance solvency: sum of pending > contract balance");
    }

    // ══════════════════════════════════════════════════════════════
    //  Invariant: Conservation of Funds
    // ══════════════════════════════════════════════════════════════

    /// @dev Total deposited minus total withdrawn must always equal the contract balance.
    ///      This is the fundamental conservation law — no tokens created or destroyed inside escrow.
    function invariant_balanceEquation() public view {
        uint256 contractBalance = usdc.balanceOf(address(escrow));
        uint256 deposited = handler.ghost_totalDeposited();
        uint256 withdrawn = handler.ghost_totalWithdrawn();
        assertEq(deposited - withdrawn, contractBalance, "Balance equation: deposited - withdrawn != balance");
    }

    /// @dev Contract balance must equal sum of pending balances + sum of active funded deal amounts.
    ///      This proves resolved deals have been fully distributed (nothing stuck).
    function invariant_noFundsLockedInResolved() public view {
        uint256 contractBalance = usdc.balanceOf(address(escrow));
        uint256 totalPending;

        uint256 pendingLen = handler.getPendingUsersLength();
        for (uint256 i; i < pendingLen; i++) {
            address user = handler.getPendingUserAt(i);
            totalPending += escrow.pendingBalance(user, address(usdc));
        }

        uint256 activeFunded = handler.ghost_fundedDealAmountSum();
        assertEq(contractBalance, totalPending + activeFunded, "Funds locked in resolved deals");
    }

    // ══════════════════════════════════════════════════════════════
    //  Invariant: Fee Accuracy
    // ══════════════════════════════════════════════════════════════

    /// @dev For every resolved deal where seller won, verify that
    ///      sellerPayout + platformFee + middlemanFee == deal.amount (no rounding leakage).
    function invariant_feeAccuracy() public view {
        uint256 len = handler.getDealIdsLength();
        for (uint256 i; i < len; i++) {
            uint256 dealId = handler.getDealIdAt(i);
            Deal memory deal = escrow.getDeal(dealId);

            // Only check seller-win resolutions
            if (deal.resolution != ResolutionType.Delivery && deal.resolution != ResolutionType.MiddlemanSeller) {
                continue;
            }

            uint256 platformFee = Math.mulDiv(deal.amount, deal.platformFeeBps, 10_000);
            uint256 middlemanFee = Math.mulDiv(deal.amount, deal.middlemanCommissionBps, 10_000);
            uint256 sellerPayout = uint256(deal.amount) - platformFee - middlemanFee;

            // Combined fees must not exceed the deal amount
            assertLe(platformFee + middlemanFee, deal.amount, "Fee accuracy: combined fees exceed amount");

            // Conservation: payout + fees == amount
            assertEq(
                sellerPayout + platformFee + middlemanFee,
                deal.amount,
                "Fee accuracy: payout + fees != amount"
            );
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Invariant: State Machine
    // ══════════════════════════════════════════════════════════════

    /// @dev Deal states must only move forward (higher enum ordinal). Never backward.
    function invariant_stateMonotonicity() public view {
        uint256 len = handler.getDealIdsLength();
        for (uint256 i; i < len; i++) {
            uint256 dealId = handler.getDealIdAt(i);
            Deal memory deal = escrow.getDeal(dealId);
            uint8 currentState = uint8(deal.state);
            uint8 previousState = handler.ghost_dealStates(dealId);

            assertGe(currentState, previousState, "State monotonicity: state went backward");
        }
    }

    /// @dev The deal counter must never decrease.
    function invariant_dealCounterMonotonic() public view {
        uint256 currentCounter = escrow.getDealCount();
        assertGe(currentCounter, handler.ghost_previousDealCounter(), "Deal counter decreased");
    }

    // ══════════════════════════════════════════════════════════════
    //  Invariant: Access Control & Constraints
    // ══════════════════════════════════════════════════════════════

    /// @dev No deal may have duplicate participant addresses (self-deal prevention).
    function invariant_noSelfDeals() public view {
        uint256 len = handler.getDealIdsLength();
        for (uint256 i; i < len; i++) {
            uint256 dealId = handler.getDealIdAt(i);
            Deal memory deal = escrow.getDeal(dealId);

            if (deal.client != address(0) && deal.seller != address(0)) {
                assertTrue(deal.client != deal.seller, "Self deal: client == seller");
            }
            if (deal.client != address(0) && deal.middleman != address(0)) {
                assertTrue(deal.client != deal.middleman, "Self deal: client == middleman");
            }
            if (deal.seller != address(0) && deal.middleman != address(0)) {
                assertTrue(deal.seller != deal.middleman, "Self deal: seller == middleman");
            }
        }
    }

    /// @dev Combined fees (platform + middleman) must always be < 100% for every deal.
    function invariant_feeCap() public view {
        uint256 len = handler.getDealIdsLength();
        for (uint256 i; i < len; i++) {
            uint256 dealId = handler.getDealIdAt(i);
            Deal memory deal = escrow.getDeal(dealId);

            uint16 combined = deal.platformFeeBps + deal.middlemanCommissionBps;
            assertLt(combined, 10_000, "Fee cap: combined fees >= 10000 bps");
        }
    }

    /// @dev Cancelled deals (Resolved + ResolutionType.None) must never have held funds.
    function invariant_cancelledDealsNoLockedFunds() public view {
        uint256 len = handler.getDealIdsLength();
        for (uint256 i; i < len; i++) {
            uint256 dealId = handler.getDealIdAt(i);
            Deal memory deal = escrow.getDeal(dealId);

            if (deal.state == DealState.Resolved && deal.resolution == ResolutionType.None) {
                assertEq(handler.ghost_dealAmounts(dealId), 0, "Cancelled deal has recorded funded amount");
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Invariant: NFT Integrity
    // ══════════════════════════════════════════════════════════════

    /// @dev SoulboundNFT supply must equal the number of resolved deals (1 SBT per resolution).
    function invariant_soulboundIntegrity() public view {
        uint256 totalSBT;
        for (uint256 i; i < 3; i++) {
            totalSBT += soulbound.balanceOf(handler.middlemen(i));
        }
        assertEq(totalSBT, handler.ghost_resolvedDealCount(), "SBT integrity: supply != resolved deals");
    }

    /// @dev ReceiptNFT supply must equal 2x resolved deals (1 receipt per client + 1 per seller).
    function invariant_receiptNFTIntegrity() public view {
        uint256 totalReceipts;
        for (uint256 i; i < 5; i++) {
            totalReceipts += receipt.balanceOf(handler.clients(i));
            totalReceipts += receipt.balanceOf(handler.sellers(i));
        }
        assertEq(
            totalReceipts,
            handler.ghost_resolvedDealCount() * 2,
            "Receipt NFT integrity: supply != 2 * resolved deals"
        );
    }

    // ══════════════════════════════════════════════════════════════
    //  afterInvariant — Drain Test
    // ══════════════════════════════════════════════════════════════

    /// @dev After all fuzzer sequences, verify every user can withdraw and contract drains properly.
    function afterInvariant() public {
        // Withdraw all pending balances
        uint256 pendingLen = handler.getPendingUsersLength();
        for (uint256 i; i < pendingLen; i++) {
            address user = handler.getPendingUserAt(i);
            uint96 bal = escrow.pendingBalance(user, address(usdc));
            if (bal > 0) {
                vm.prank(user);
                escrow.withdraw();
            }
        }

        // Also try feeRecipient (may already be in pending users)
        uint96 feeBalance = escrow.pendingBalance(feeRecipient, address(usdc));
        if (feeBalance > 0) {
            vm.prank(feeRecipient);
            escrow.withdraw();
        }

        // After all withdrawals, contract balance should equal active funded deals only
        uint256 remainingBalance = usdc.balanceOf(address(escrow));
        uint256 activeFunded = handler.ghost_fundedDealAmountSum();
        assertEq(remainingBalance, activeFunded, "afterInvariant: remaining balance != active funded deals");

        // Verify no pending balances remain
        for (uint256 i; i < pendingLen; i++) {
            address user = handler.getPendingUserAt(i);
            assertEq(
                escrow.pendingBalance(user, address(usdc)), 0, "afterInvariant: pending balance not zero after drain"
            );
        }
    }
}
