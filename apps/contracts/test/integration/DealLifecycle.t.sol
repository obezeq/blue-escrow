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
    DeliveryConfirmed,
    DealResolved,
    AmountIncreased,
    Withdrawal,
    ReceiptNFTMinted,
    SoulboundNFTMinted
} from "../../src/utils/Events.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title DealLifecycleTest
/// @notice Integration tests for the happy-path deal lifecycle across all contracts.
contract DealLifecycleTest is Test {
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
        // 1. Deploy MockUSDC and MiddlemanRegistry
        usdc = new MockUSDC();
        registry = new MiddlemanRegistry(owner);

        // 2. Predict Escrow address so NFTs can use it as immutable minter
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

        // 5. Register middleman
        vm.prank(middleman);
        registry.register(MIDDLEMAN_COMMISSION_BPS);

        // 6. Whitelist USDC
        escrow.addAllowedToken(address(usdc));

        // 7. Mint USDC to client
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

    // ═══════════════════════════════════════════════════════════════
    //  Test: Full Deal Lifecycle (Happy Path)
    // ═══════════════════════════════════════════════════════════════

    function test_FullDealLifecycle() public {
        // ── Step 1: Create deal ──────────────────────────────────
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealCreated(1, client, client, seller, middleman, address(usdc), DEAL_AMOUNT);

        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        assertEq(dealId, 1);
        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined));
        assertEq(deal.client, client);
        assertEq(deal.seller, seller);
        assertEq(deal.middleman, middleman);
        assertEq(deal.amount, DEAL_AMOUNT);
        assertEq(deal.middlemanCommissionBps, MIDDLEMAN_COMMISSION_BPS, "Cross-contract: registry commission lookup");
        assertEq(deal.platformFeeBps, PLATFORM_FEE_BPS);
        assertEq(escrow.getDealCount(), 1);

        // ── Step 2: Sign deal (3 signatures) ─────────────────────
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealSigned(dealId, client);
        vm.prank(client);
        escrow.signDeal(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined), "Still Joined after 1 signature");

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealSigned(dealId, seller);
        vm.prank(seller);
        escrow.signDeal(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined), "Still Joined after 2 signatures");

        uint48 expectedDeadline = uint48(block.timestamp) + DEFAULT_TIMEOUT;

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealSigned(dealId, middleman);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit DealFullySigned(dealId, expectedDeadline);

        vm.prank(middleman);
        escrow.signDeal(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Signed), "Signed after 3 signatures");
        assertEq(deal.deadline, expectedDeadline);

        // ── Step 3: Fund deal ────────────────────────────────────
        uint256 clientBalBefore = usdc.balanceOf(client);

        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealFunded(dealId, client, DEAL_AMOUNT);
        escrow.fundDeal(dealId);
        vm.stopPrank();

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Funded));
        assertEq(usdc.balanceOf(address(escrow)), DEAL_AMOUNT, "Escrow holds USDC");
        assertEq(usdc.balanceOf(client), clientBalBefore - DEAL_AMOUNT, "Client USDC decreased");

        // ── Step 4: Confirm delivery ─────────────────────────────
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        // Expect events in emission order: DeliveryConfirmed -> DealResolved -> NFT mints
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DeliveryConfirmed(dealId, client);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Delivery, 0, expectedSellerPayout);
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(1, client, dealId);
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(2, seller, dealId);
        vm.expectEmit(true, true, true, true, address(soulbound));
        emit SoulboundNFTMinted(1, middleman, dealId);

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        // Verify deal state
        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Delivery));

        // Verify pending balances
        uint96 sellerPending = escrow.pendingBalance(seller, address(usdc));
        uint96 middlemanPending = escrow.pendingBalance(middleman, address(usdc));
        uint96 feePending = escrow.pendingBalance(feeRecipient, address(usdc));

        assertEq(sellerPending, expectedSellerPayout, "Seller pending balance");
        assertEq(middlemanPending, uint96(expectedMiddlemanFee), "Middleman pending balance");
        assertEq(feePending, uint96(expectedPlatformFee), "FeeRecipient pending balance");
        assertEq(
            uint256(sellerPending) + uint256(middlemanPending) + uint256(feePending),
            DEAL_AMOUNT,
            "Fee invariant: all fees sum to deal amount"
        );

        // Verify NFTs (cross-contract: Escrow called ReceiptNFT.mint + SoulboundNFT.mint)
        assertEq(receipt.ownerOf(1), client, "Receipt NFT #1 -> client");
        assertEq(receipt.ownerOf(2), seller, "Receipt NFT #2 -> seller");
        assertEq(receipt.getDealId(1), dealId);
        assertEq(receipt.getDealId(2), dealId);
        assertEq(receipt.balanceOf(client), 1);
        assertEq(receipt.balanceOf(seller), 1);

        assertEq(soulbound.ownerOf(1), middleman, "Soulbound NFT #1 -> middleman");
        assertEq(soulbound.getDealId(1), dealId);
        assertEq(soulbound.getTotalDeals(middleman), 1, "Middleman reputation count");

        // ── Step 5: Withdrawals ──────────────────────────────────
        uint256 sellerBalBefore = usdc.balanceOf(seller);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit Withdrawal(seller, address(usdc), expectedSellerPayout);
        vm.prank(seller);
        escrow.withdraw();
        assertEq(usdc.balanceOf(seller), sellerBalBefore + expectedSellerPayout, "Seller USDC after withdraw");
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);

        uint256 middlemanBalBefore = usdc.balanceOf(middleman);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit Withdrawal(middleman, address(usdc), uint96(expectedMiddlemanFee));
        vm.prank(middleman);
        escrow.withdraw();
        assertEq(
            usdc.balanceOf(middleman), middlemanBalBefore + expectedMiddlemanFee, "Middleman USDC after withdraw"
        );
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);

        uint256 feeBalBefore = usdc.balanceOf(feeRecipient);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit Withdrawal(feeRecipient, address(usdc), uint96(expectedPlatformFee));
        vm.prank(feeRecipient);
        escrow.withdraw();
        assertEq(usdc.balanceOf(feeRecipient), feeBalBefore + expectedPlatformFee, "FeeRecipient USDC after withdraw");
        assertEq(escrow.pendingBalance(feeRecipient, address(usdc)), 0);

        // Escrow contract is fully drained
        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained");
    }

    // ═══════════════════════════════════════════════════════════════
    //  Test: Amount Increase + Full Lifecycle
    // ═══════════════════════════════════════════════════════════════

    function test_AmountIncrease() public {
        uint96 INCREASED_AMOUNT = 1_500_000_000; // 1,500 USDC
        uint96 INCREASE_DIFFERENCE = INCREASED_AMOUNT - DEAL_AMOUNT; // 500 USDC

        // ── Steps 1-3: Create -> Sign -> Fund ──────────────────────
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

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

        assertEq(usdc.balanceOf(address(escrow)), DEAL_AMOUNT);

        // ── Step 4: Dual-consent amount increase ─────────────────

        // Seller proposes increase
        vm.prank(seller);
        escrow.increaseAmount(dealId, INCREASED_AMOUNT);

        // Deal amount unchanged (only one party agreed)
        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, DEAL_AMOUNT, "Amount unchanged after single proposal");

        // Client approves additional USDC and confirms
        vm.startPrank(client);
        usdc.approve(address(escrow), INCREASE_DIFFERENCE);

        vm.expectEmit(true, false, false, true, address(escrow));
        emit AmountIncreased(dealId, DEAL_AMOUNT, INCREASED_AMOUNT);

        escrow.increaseAmount(dealId, INCREASED_AMOUNT);
        vm.stopPrank();

        // Verify increase executed
        deal = escrow.getDeal(dealId);
        assertEq(deal.amount, INCREASED_AMOUNT, "Amount updated after dual consent");
        assertEq(usdc.balanceOf(address(escrow)), INCREASED_AMOUNT, "Escrow holds full increased amount");

        // ── Step 5: Confirm delivery with new amount ─────────────
        uint256 expectedPlatformFee = _platformFee(INCREASED_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(INCREASED_AMOUNT);
        uint96 expectedSellerPayout = uint96(INCREASED_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DeliveryConfirmed(dealId, client);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Delivery, 0, expectedSellerPayout);

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        // Verify fees on INCREASED amount
        uint96 sellerPending = escrow.pendingBalance(seller, address(usdc));
        uint96 middlemanPending = escrow.pendingBalance(middleman, address(usdc));
        uint96 feePending = escrow.pendingBalance(feeRecipient, address(usdc));

        assertEq(sellerPending, expectedSellerPayout, "Seller pending (increased amount)");
        assertEq(middlemanPending, uint96(expectedMiddlemanFee), "Middleman pending (increased amount)");
        assertEq(feePending, uint96(expectedPlatformFee), "FeeRecipient pending (increased amount)");
        assertEq(
            uint256(sellerPending) + uint256(middlemanPending) + uint256(feePending),
            INCREASED_AMOUNT,
            "Fee invariant on increased amount"
        );

        // NFTs minted
        assertEq(receipt.ownerOf(1), client);
        assertEq(receipt.ownerOf(2), seller);
        assertEq(soulbound.ownerOf(1), middleman);

        // ── Step 6: Withdrawals ──────────────────────────────────
        vm.prank(seller);
        escrow.withdraw();
        vm.prank(middleman);
        escrow.withdraw();
        vm.prank(feeRecipient);
        escrow.withdraw();

        assertEq(usdc.balanceOf(address(escrow)), 0, "Escrow fully drained after increase lifecycle");
    }
}
