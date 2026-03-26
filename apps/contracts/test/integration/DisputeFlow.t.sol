// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Test } from "forge-std/Test.sol";
import { Escrow } from "../../src/core/Escrow.sol";
import { MiddlemanRegistry } from "../../src/registry/MiddlemanRegistry.sol";
import { SoulboundNFT } from "../../src/tokens/SoulboundNFT.sol";
import { ReceiptNFT } from "../../src/tokens/ReceiptNFT.sol";
import { MockUSDC } from "../mocks/MockUSDC.sol";
import { Deal, DealState, DealConfig, ResolutionType, ParticipantRole } from "../../src/types/DataTypes.sol";
import {
    DealCreated,
    DealSigned,
    DealFullySigned,
    DealFunded,
    RefundRequested,
    DealDisputed,
    DealResolved,
    DealTimedOut,
    Withdrawal,
    ReceiptNFTMinted,
    SoulboundNFTMinted
} from "../../src/utils/Events.sol";
import { Escrow__NothingToWithdraw } from "../../src/utils/Errors.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title DisputeFlowTest
/// @notice Integration tests for dispute resolution and timeout flows across all contracts.
contract DisputeFlowTest is Test {
    // ──────────────────────────────────────────────────────────────
    //  Contracts
    // ──────────────────────────────────────────────────────────────

    Escrow internal escrow;
    MiddlemanRegistry internal registry;
    SoulboundNFT internal soulbound;
    ReceiptNFT internal receipt;
    MockUSDC internal usdc;

    // ──────────────────────────────────────────────────────────────
    //  Actors
    // ──────────────────────────────────────────────────────────────

    address internal owner = address(this);
    address internal client = makeAddr("client");
    address internal seller = makeAddr("seller");
    address internal middleman = makeAddr("middleman");
    address internal feeRecipient = makeAddr("feeRecipient");

    // ──────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────

    uint16 internal constant MIDDLEMAN_COMMISSION_BPS = 500; // 5%
    uint16 internal constant PLATFORM_FEE_BPS = 33; // 0.33%
    uint48 internal constant DEFAULT_TIMEOUT = 33 days;
    uint96 internal constant DEAL_AMOUNT = 1_000_000_000; // 1,000 USDC (6 decimals)
    uint96 internal constant CLIENT_MINT_AMOUNT = 100_000_000_000; // 100,000 USDC

    // ──────────────────────────────────────────────────────────────
    //  setUp
    // ──────────────────────────────────────────────────────────────

    function setUp() public {
        usdc = new MockUSDC();
        registry = new MiddlemanRegistry(owner);

        uint64 nonce = vm.getNonce(address(this));
        address predictedEscrow = vm.computeCreateAddress(address(this), nonce + 2);

        soulbound = new SoulboundNFT(predictedEscrow);
        receipt = new ReceiptNFT(predictedEscrow);

        DealConfig memory config =
            DealConfig({ feeRecipient: feeRecipient, defaultTimeout: DEFAULT_TIMEOUT, platformFeeBps: PLATFORM_FEE_BPS });
        escrow = new Escrow(owner, config, address(registry), address(soulbound), address(receipt));
        assertEq(address(escrow), predictedEscrow, "Escrow address prediction mismatch");

        vm.prank(middleman);
        registry.register(MIDDLEMAN_COMMISSION_BPS);

        escrow.addAllowedToken(address(usdc));
        usdc.mint(client, CLIENT_MINT_AMOUNT);
    }

    // ──────────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────────

    function _platformFee(uint256 amount) internal pure returns (uint256) {
        return Math.mulDiv(amount, PLATFORM_FEE_BPS, 10_000);
    }

    function _middlemanFee(uint256 amount) internal pure returns (uint256) {
        return Math.mulDiv(amount, MIDDLEMAN_COMMISSION_BPS, 10_000);
    }

    /// @dev Creates deal with all 3 participants -> signs all 3 -> client funds. Returns dealId in Funded state.
    function _createFundedDeal() internal returns (uint256 dealId) {
        vm.prank(client);
        dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        vm.prank(client);
        escrow.signDeal(dealId);
        vm.prank(seller);
        escrow.signDeal(dealId);
        vm.prank(middleman);
        escrow.signDeal(dealId);

        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);
        escrow.fundDeal(dealId);
        vm.stopPrank();
    }

    /// @dev Asserts receipt NFTs minted to client/seller and soulbound to middleman.
    function _assertNFTsMinted(uint256 dealId) internal view {
        assertEq(receipt.ownerOf(1), client, "Receipt NFT #1 -> client");
        assertEq(receipt.ownerOf(2), seller, "Receipt NFT #2 -> seller");
        assertEq(receipt.getDealId(1), dealId);
        assertEq(receipt.getDealId(2), dealId);
        assertEq(receipt.balanceOf(client), 1);
        assertEq(receipt.balanceOf(seller), 1);

        assertEq(soulbound.ownerOf(1), middleman, "Soulbound NFT #1 -> middleman");
        assertEq(soulbound.getDealId(1), dealId);
        assertEq(soulbound.getTotalDeals(middleman), 1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Test: Dispute Resolved for Buyer (Client Wins)
    // ═══════════════════════════════════════════════════════════════

    function test_DisputeResolvedForBuyer() public {
        uint256 dealId = _createFundedDeal();

        // ── Request refund ───────────────────────────────────────
        vm.expectEmit(true, true, false, true, address(escrow));
        emit RefundRequested(dealId, client);

        vm.prank(client);
        escrow.requestRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.RefundRequested));

        // ── Seller rejects -> Disputed ────────────────────────────
        vm.expectEmit(true, false, false, true, address(escrow));
        emit DealDisputed(dealId);

        vm.prank(seller);
        escrow.rejectRefund(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Disputed));

        // ── Middleman resolves for buyer ─────────────────────────
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.MiddlemanBuyer, DEAL_AMOUNT, 0);
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(1, client, dealId);
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(2, seller, dealId);
        vm.expectEmit(true, true, true, true, address(soulbound));
        emit SoulboundNFTMinted(1, middleman, dealId);

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);

        // Verify state
        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.MiddlemanBuyer));

        // Client wins: full amount, no fees
        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT, "Client gets full refund");
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0, "Seller gets nothing");
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0, "Middleman gets nothing");
        assertEq(escrow.pendingBalance(feeRecipient, address(usdc)), 0, "Platform gets nothing");

        // NFTs still minted regardless of winner
        _assertNFTsMinted(dealId);

        // ── Client withdraws full amount ─────────────────────────
        vm.expectEmit(true, true, false, true, address(escrow));
        emit Withdrawal(client, address(usdc), DEAL_AMOUNT);

        vm.prank(client);
        escrow.withdraw();

        assertEq(usdc.balanceOf(client), CLIENT_MINT_AMOUNT, "Client net zero (got refund)");
        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained");

        // Others cannot withdraw
        vm.prank(seller);
        vm.expectRevert(Escrow__NothingToWithdraw.selector);
        escrow.withdraw();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Test: Dispute Resolved for Seller (Seller Wins)
    // ═══════════════════════════════════════════════════════════════

    function test_DisputeResolvedForSeller() public {
        uint256 dealId = _createFundedDeal();

        // ── Request refund -> reject -> dispute ────────────────────
        vm.prank(client);
        escrow.requestRefund(dealId);

        vm.prank(seller);
        escrow.rejectRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Disputed));

        // ── Middleman resolves for seller ────────────────────────
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.MiddlemanSeller, 0, expectedSellerPayout);

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        // Verify state
        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.MiddlemanSeller));

        // Seller wins: fees deducted
        uint96 sellerPending = escrow.pendingBalance(seller, address(usdc));
        uint96 middlemanPending = escrow.pendingBalance(middleman, address(usdc));
        uint96 feePending = escrow.pendingBalance(feeRecipient, address(usdc));

        assertEq(sellerPending, expectedSellerPayout, "Seller pending balance");
        assertEq(middlemanPending, uint96(expectedMiddlemanFee), "Middleman pending balance");
        assertEq(feePending, uint96(expectedPlatformFee), "Platform pending balance");
        assertEq(escrow.pendingBalance(client, address(usdc)), 0, "Client gets nothing");
        assertEq(
            uint256(sellerPending) + uint256(middlemanPending) + uint256(feePending),
            DEAL_AMOUNT,
            "Fee invariant: all fees sum to deal amount"
        );

        // NFTs minted
        _assertNFTsMinted(dealId);

        // ── All parties withdraw ─────────────────────────────────
        vm.prank(seller);
        escrow.withdraw();
        vm.prank(middleman);
        escrow.withdraw();
        vm.prank(feeRecipient);
        escrow.withdraw();

        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained");
    }

    // ═══════════════════════════════════════════════════════════════
    //  Test: Timeout from Funded State
    // ═══════════════════════════════════════════════════════════════

    function test_TimeoutFromFunded() public {
        uint256 dealId = _createFundedDeal();

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Funded));

        // ── Warp past deadline ───────────────────────────────────
        vm.warp(uint256(deal.deadline) + 1);

        // ── Execute timeout (anyone can call) ────────────────────
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealTimedOut(dealId, address(this));
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Timeout, DEAL_AMOUNT, 0);
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(1, client, dealId);
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(2, seller, dealId);
        vm.expectEmit(true, true, true, true, address(soulbound));
        emit SoulboundNFTMinted(1, middleman, dealId);

        escrow.executeTimeout(dealId);

        // State is TimedOut, NOT Resolved (Escrow.sol:534 skips when already TimedOut)
        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut), "Terminal state: TimedOut");
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Timeout));

        // Client gets full amount (no fees on timeout)
        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT, "Client gets full refund");
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);
        assertEq(escrow.pendingBalance(feeRecipient, address(usdc)), 0);

        // NFTs still minted even on timeout
        _assertNFTsMinted(dealId);

        // ── Client withdraws ─────────────────────────────────────
        vm.prank(client);
        escrow.withdraw();

        assertEq(usdc.balanceOf(client), CLIENT_MINT_AMOUNT, "Client net zero after timeout");
        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained");
    }

    // ═══════════════════════════════════════════════════════════════
    //  Test: Timeout from RefundRequested State
    // ═══════════════════════════════════════════════════════════════

    function test_TimeoutFromRefundRequested() public {
        uint256 dealId = _createFundedDeal();

        // ── Client requests refund ───────────────────────────────
        vm.prank(client);
        escrow.requestRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.RefundRequested), "State: RefundRequested");

        // ── Warp past deadline + execute timeout ─────────────────
        vm.warp(uint256(deal.deadline) + 1);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealTimedOut(dealId, address(this));
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Timeout, DEAL_AMOUNT, 0);

        escrow.executeTimeout(dealId);

        // Verify
        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut), "Terminal state: TimedOut");
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Timeout));
        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT, "Client gets full refund");
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);

        // NFTs minted
        _assertNFTsMinted(dealId);

        // Withdraw + drain check
        vm.prank(client);
        escrow.withdraw();
        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained");
    }

    // ═══════════════════════════════════════════════════════════════
    //  Test: Timeout from Disputed State
    // ═══════════════════════════════════════════════════════════════

    function test_TimeoutFromDisputed() public {
        uint256 dealId = _createFundedDeal();

        // ── Request refund -> reject -> Disputed ───────────────────
        vm.prank(client);
        escrow.requestRefund(dealId);
        vm.prank(seller);
        escrow.rejectRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Disputed), "State: Disputed");

        // ── Warp past deadline + execute timeout ─────────────────
        vm.warp(uint256(deal.deadline) + 1);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealTimedOut(dealId, address(this));
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Timeout, DEAL_AMOUNT, 0);

        escrow.executeTimeout(dealId);

        // Verify
        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut), "Terminal state: TimedOut");
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Timeout));
        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT, "Client gets full refund");
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);

        // NFTs minted
        _assertNFTsMinted(dealId);

        // Withdraw + drain check
        vm.prank(client);
        escrow.withdraw();
        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained");
    }
}
