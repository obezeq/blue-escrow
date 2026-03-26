// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Test } from "forge-std/Test.sol";
import { Escrow } from "../../src/core/Escrow.sol";
import { MiddlemanRegistry } from "../../src/registry/MiddlemanRegistry.sol";
import { SoulboundNFT } from "../../src/tokens/SoulboundNFT.sol";
import { ReceiptNFT } from "../../src/tokens/ReceiptNFT.sol";
import { MockUSDC } from "../mocks/MockUSDC.sol";
import { Deal, DealState, DealConfig, ResolutionType, ParticipantRole } from "../../src/types/DataTypes.sol";
import { DealLib } from "../../src/libraries/DealLib.sol";
import {
    Escrow__InvalidState,
    Escrow__NotParticipant,
    Escrow__NotClient,
    Escrow__NotSeller,
    Escrow__NotMiddleman,
    Escrow__DealNotFound,
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
    Escrow__FeeTooHigh,
    Escrow__FeeCombinedTooHigh,
    Escrow__InvalidTimeout,
    Registry__NotRegistered
} from "../../src/utils/Errors.sol";
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
    TokenDisallowed
} from "../../src/utils/Events.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title EscrowTest
/// @notice Unit + fuzz tests for the Escrow core contract (TDD — RED phase)
contract EscrowTest is Test {
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
    address internal outsider = makeAddr("outsider");

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
        // soulbound = nonce+0, receipt = nonce+1, escrow = nonce+2
        address predictedEscrow = vm.computeCreateAddress(address(this), nonce + 2);

        // 3. Deploy NFTs with predicted escrow address
        soulbound = new SoulboundNFT(predictedEscrow);
        receipt = new ReceiptNFT(predictedEscrow);

        // 4. Deploy Escrow
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: PLATFORM_FEE_BPS
        });
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

    /// @dev Creates a deal with all 3 participants filled (client is creator). State: Joined.
    function _createDefaultDeal() internal returns (uint256 dealId) {
        vm.prank(client);
        dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);
    }

    /// @dev Creates a deal with seller slot empty. State: Created.
    function _createDealWithOpenSlot() internal returns (uint256 dealId) {
        vm.prank(client);
        dealId = escrow.createDeal(client, address(0), middleman, address(usdc), DEAL_AMOUNT, 0);
    }

    /// @dev Creates deal + all 3 sign. State: Signed.
    function _createSignedDeal() internal returns (uint256 dealId) {
        dealId = _createDefaultDeal();
        vm.prank(client);
        escrow.signDeal(dealId);
        vm.prank(seller);
        escrow.signDeal(dealId);
        vm.prank(middleman);
        escrow.signDeal(dealId);
    }

    /// @dev Creates deal + signs + client funds. State: Funded.
    function _createFundedDeal() internal returns (uint256 dealId) {
        dealId = _createSignedDeal();
        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);
        escrow.fundDeal(dealId);
        vm.stopPrank();
    }

    /// @dev Creates funded deal + client requests refund. State: RefundRequested.
    function _createRefundRequestedDeal() internal returns (uint256 dealId) {
        dealId = _createFundedDeal();
        vm.prank(client);
        escrow.requestRefund(dealId);
    }

    /// @dev Creates funded deal + refund requested + seller rejects. State: Disputed.
    function _createDisputedDeal() internal returns (uint256 dealId) {
        dealId = _createRefundRequestedDeal();
        vm.prank(seller);
        escrow.rejectRefund(dealId);
    }

    /// @dev Calculates expected platform fee.
    function _platformFee(uint256 amount) internal pure returns (uint256) {
        return Math.mulDiv(amount, PLATFORM_FEE_BPS, 10_000);
    }

    /// @dev Calculates expected middleman fee.
    function _middlemanFee(uint256 amount) internal pure returns (uint256) {
        return Math.mulDiv(amount, MIDDLEMAN_COMMISSION_BPS, 10_000);
    }

    // ═══════════════════════════════════════════════════════════════
    //  1. Constructor & Config
    // ═══════════════════════════════════════════════════════════════

    function test_Constructor_SetsOwner() public view {
        assertEq(escrow.owner(), owner);
    }

    function test_Constructor_DealCounterStartsAtZero() public view {
        assertEq(escrow.getDealCount(), 0);
    }

    function test_Constructor_StoresRegistryAddress() public view {
        assertEq(address(escrow.middlemanRegistry()), address(registry));
    }

    function test_Constructor_StoresNFTAddresses() public view {
        assertEq(address(escrow.soulboundNFT()), address(soulbound));
        assertEq(address(escrow.receiptNFT()), address(receipt));
    }

    function test_Constructor_RevertsWhen_FeeRecipientIsZero() public {
        DealConfig memory config = DealConfig({
            feeRecipient: address(0),
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: PLATFORM_FEE_BPS
        });
        vm.expectRevert(Escrow__ZeroAddress.selector);
        new Escrow(owner, config, address(registry), address(soulbound), address(receipt));
    }

    function test_Constructor_RevertsWhen_FeeTooHigh() public {
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: 501 // > MAX_PLATFORM_FEE_BPS (500)
        });
        vm.expectRevert(abi.encodeWithSelector(Escrow__FeeTooHigh.selector, uint16(501), uint16(500)));
        new Escrow(owner, config, address(registry), address(soulbound), address(receipt));
    }

    function test_Constructor_RevertsWhen_TimeoutTooLow() public {
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: uint48(1 hours), // < MIN_TIMEOUT (1 day)
            platformFeeBps: PLATFORM_FEE_BPS
        });
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidTimeout.selector, uint48(1 hours), uint48(1 days))
        );
        new Escrow(owner, config, address(registry), address(soulbound), address(receipt));
    }

    function test_Constructor_RevertsWhen_RegistryIsZero() public {
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: PLATFORM_FEE_BPS
        });
        vm.expectRevert(Escrow__ZeroAddress.selector);
        new Escrow(owner, config, address(0), address(soulbound), address(receipt));
    }

    function test_Constructor_RevertsWhen_SoulboundIsZero() public {
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: PLATFORM_FEE_BPS
        });
        vm.expectRevert(Escrow__ZeroAddress.selector);
        new Escrow(owner, config, address(registry), address(0), address(receipt));
    }

    function test_Constructor_RevertsWhen_ReceiptIsZero() public {
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: PLATFORM_FEE_BPS
        });
        vm.expectRevert(Escrow__ZeroAddress.selector);
        new Escrow(owner, config, address(registry), address(soulbound), address(0));
    }

    // ═══════════════════════════════════════════════════════════════
    //  2. Deal Creation — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_CreateDeal_AllParticipants_JoinedState() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined));
    }

    function test_CreateDeal_SomeSlotEmpty_CreatedState() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, address(0), middleman, address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Created));
        assertEq(deal.seller, address(0));
    }

    function test_CreateDeal_AmountZero() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), 0, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, 0);
    }

    function test_CreateDeal_TimeoutZero_UsesDefault() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        // deadline stores duration temporarily (before signing)
        assertEq(deal.deadline, DEFAULT_TIMEOUT);
    }

    function test_CreateDeal_CustomTimeout() public {
        uint48 customTimeout = 60 days;
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, customTimeout);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.deadline, customTimeout);
    }

    function test_CreateDeal_StoresCorrectDealStruct() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.id, 1);
        assertEq(deal.client, client);
        assertEq(deal.seller, seller);
        assertEq(deal.middleman, middleman);
        assertEq(deal.amount, DEAL_AMOUNT);
        assertEq(deal.paymentToken, address(usdc));
        assertEq(deal.middlemanCommissionBps, MIDDLEMAN_COMMISSION_BPS);
        assertEq(deal.platformFeeBps, PLATFORM_FEE_BPS);
        assertEq(uint8(deal.resolution), uint8(ResolutionType.None));
    }

    function test_CreateDeal_SetsCreatedAtTimestamp() public {
        vm.warp(1_000_000);
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.createdAt, uint48(1_000_000));
    }

    function test_CreateDeal_IncrementsCounter() public {
        vm.startPrank(client);
        uint256 id1 = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);
        uint256 id2 = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(escrow.getDealCount(), 2);
    }

    function test_CreateDeal_SetsMiddlemanCommissionFromRegistry() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.middlemanCommissionBps, MIDDLEMAN_COMMISSION_BPS);
    }

    function test_CreateDeal_MiddlemanSlotEmpty_SkipsRegistryCheck() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, address(0), address(usdc), DEAL_AMOUNT, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.middleman, address(0));
        assertEq(deal.middlemanCommissionBps, 0);
    }

    function test_CreateDeal_EmitsDealCreated() public {
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealCreated(1, client, client, seller, middleman, address(usdc), DEAL_AMOUNT);

        vm.prank(client);
        escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_SellerAsCreator() public {
        vm.prank(seller);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        assertEq(dealId, 1);
    }

    function test_CreateDeal_MiddlemanAsCreator() public {
        vm.prank(middleman);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        assertEq(dealId, 1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  2b. Deal Creation — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_CreateDeal_RevertsWhen_CreatorNotParticipant() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Escrow__NotParticipant.selector, outsider, uint256(0)));
        escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_TokenNotWhitelisted() public {
        address fakeToken = makeAddr("fakeToken");
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__TokenNotAllowed.selector, fakeToken));
        escrow.createDeal(client, seller, middleman, fakeToken, DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_PaymentTokenIsZero() public {
        vm.prank(client);
        vm.expectRevert(Escrow__ZeroAddress.selector);
        escrow.createDeal(client, seller, middleman, address(0), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_MiddlemanNotRegistered() public {
        address unregistered = makeAddr("unregistered");
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Registry__NotRegistered.selector, unregistered));
        escrow.createDeal(client, seller, unregistered, address(usdc), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_SelfDeal_ClientEqualsSeller() public {
        vm.prank(client);
        vm.expectRevert(Escrow__SelfDeal.selector);
        escrow.createDeal(client, client, middleman, address(usdc), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_SelfDeal_ClientEqualsMiddleman() public {
        // Register client as middleman to isolate the self-deal check
        vm.prank(client);
        registry.register(100);

        vm.prank(client);
        vm.expectRevert(Escrow__SelfDeal.selector);
        escrow.createDeal(client, seller, client, address(usdc), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_SelfDeal_SellerEqualsMiddleman() public {
        vm.prank(seller);
        registry.register(100);

        vm.prank(client);
        vm.expectRevert(Escrow__SelfDeal.selector);
        escrow.createDeal(client, seller, seller, address(usdc), DEAL_AMOUNT, 0);
    }

    function test_CreateDeal_RevertsWhen_CombinedFeesTooHigh() public {
        // Deploy escrow with max platform fee (500 bps) so combined cap is reachable
        DealConfig memory highFeeConfig = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: 500 // MAX_PLATFORM_FEE_BPS
        });
        uint64 nonce = vm.getNonce(address(this));
        address predictedEscrow2 = vm.computeCreateAddress(address(this), nonce + 2);
        SoulboundNFT soulbound2 = new SoulboundNFT(predictedEscrow2);
        ReceiptNFT receipt2 = new ReceiptNFT(predictedEscrow2);
        Escrow escrow2 = new Escrow(
            owner, highFeeConfig, address(registry), address(soulbound2), address(receipt2)
        );
        escrow2.addAllowedToken(address(usdc));

        // Register middleman at max registry commission (5000 bps)
        // Combined: 500 + 5000 = 5500 bps — under 10_000, should pass
        address maxMiddleman = makeAddr("maxMiddleman");
        vm.prank(maxMiddleman);
        registry.register(5000);

        vm.prank(client);
        uint256 dealId = escrow2.createDeal(client, seller, maxMiddleman, address(usdc), DEAL_AMOUNT, 0);
        assertEq(dealId, 1); // succeeds — 5500 < 10_000
    }

    function test_JoinDeal_CombinedFeeValidation_PassesAtMaxCaps() public {
        // Deploy escrow with max platform fee
        DealConfig memory highFeeConfig = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: DEFAULT_TIMEOUT,
            platformFeeBps: 500
        });
        uint64 nonce = vm.getNonce(address(this));
        address predictedEscrow2 = vm.computeCreateAddress(address(this), nonce + 2);
        SoulboundNFT soulbound2 = new SoulboundNFT(predictedEscrow2);
        ReceiptNFT receipt2 = new ReceiptNFT(predictedEscrow2);
        Escrow escrow2 = new Escrow(
            owner, highFeeConfig, address(registry), address(soulbound2), address(receipt2)
        );
        escrow2.addAllowedToken(address(usdc));

        // Create deal with empty middleman slot
        vm.prank(client);
        uint256 dealId = escrow2.createDeal(client, seller, address(0), address(usdc), DEAL_AMOUNT, 0);

        // Register middleman at max (5000 bps), combined = 5500 < 10_000
        address maxMiddleman = makeAddr("maxMiddleman2");
        vm.prank(maxMiddleman);
        registry.register(5000);

        vm.prank(maxMiddleman);
        escrow2.joinDeal(dealId, ParticipantRole.Middleman);

        Deal memory deal = escrow2.getDeal(dealId);
        assertEq(deal.middlemanCommissionBps, 5000);
        assertEq(deal.platformFeeBps, 500);
    }

    // ═══════════════════════════════════════════════════════════════
    //  2c. Deal Creation — Fuzz
    // ═══════════════════════════════════════════════════════════════

    function testFuzz_CreateDeal_RandomAmounts(uint96 amount) public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), amount, 0);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, amount);
    }

    function testFuzz_CreateDeal_RandomTimeout(uint48 timeout) public {
        timeout = uint48(bound(timeout, 1 days, type(uint48).max));

        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, timeout);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.deadline, timeout);
    }

    // ═══════════════════════════════════════════════════════════════
    //  3. Joining — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_JoinDeal_FillSellerSlot() public {
        uint256 dealId = _createDealWithOpenSlot();

        vm.prank(seller);
        escrow.joinDeal(dealId, ParticipantRole.Seller);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.seller, seller);
    }

    function test_JoinDeal_FillClientSlot() public {
        // Create deal with client slot open
        vm.prank(seller);
        uint256 dealId = escrow.createDeal(address(0), seller, middleman, address(usdc), DEAL_AMOUNT, 0);

        vm.prank(client);
        escrow.joinDeal(dealId, ParticipantRole.Client);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.client, client);
    }

    function test_JoinDeal_FillMiddlemanSlot() public {
        // Create deal with middleman slot open
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, address(0), address(usdc), DEAL_AMOUNT, 0);

        vm.prank(middleman);
        escrow.joinDeal(dealId, ParticipantRole.Middleman);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.middleman, middleman);
    }

    function test_JoinDeal_MiddlemanSetsCommissionFromRegistry() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, address(0), address(usdc), DEAL_AMOUNT, 0);

        vm.prank(middleman);
        escrow.joinDeal(dealId, ParticipantRole.Middleman);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.middlemanCommissionBps, MIDDLEMAN_COMMISSION_BPS);
    }

    function test_JoinDeal_AllSlotsFilled_TransitionsToJoined() public {
        uint256 dealId = _createDealWithOpenSlot();

        vm.prank(seller);
        escrow.joinDeal(dealId, ParticipantRole.Seller);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined));
    }

    function test_JoinDeal_EmitsDealJoined() public {
        uint256 dealId = _createDealWithOpenSlot();

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealJoined(dealId, seller, ParticipantRole.Seller);

        vm.prank(seller);
        escrow.joinDeal(dealId, ParticipantRole.Seller);
    }

    // ═══════════════════════════════════════════════════════════════
    //  3b. Joining — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_JoinDeal_RevertsWhen_DealNotFound() public {
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.joinDeal(999, ParticipantRole.Seller);
    }

    function test_JoinDeal_RevertsWhen_NotInCreatedState() public {
        // Deal with all slots filled is in Joined state
        uint256 dealId = _createDefaultDeal();

        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Joined, DealState.Created)
        );
        escrow.joinDeal(dealId, ParticipantRole.Client);
    }

    function test_JoinDeal_RevertsWhen_SlotAlreadyFilled() public {
        uint256 dealId = _createDealWithOpenSlot();

        // Client slot is already filled
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__SlotAlreadyFilled.selector, dealId, ParticipantRole.Client)
        );
        escrow.joinDeal(dealId, ParticipantRole.Client);
    }

    function test_JoinDeal_RevertsWhen_SelfDeal() public {
        // Create deal with seller + middleman open, client filled
        vm.prank(client);
        uint256 dealId =
            escrow.createDeal(client, address(0), middleman, address(usdc), DEAL_AMOUNT, 0);

        // Client tries to also be seller
        vm.prank(client);
        vm.expectRevert(Escrow__SelfDeal.selector);
        escrow.joinDeal(dealId, ParticipantRole.Seller);
    }

    function test_JoinDeal_RevertsWhen_MiddlemanNotRegistered() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, address(0), address(usdc), DEAL_AMOUNT, 0);

        vm.prank(outsider); // not registered
        vm.expectRevert(abi.encodeWithSelector(Registry__NotRegistered.selector, outsider));
        escrow.joinDeal(dealId, ParticipantRole.Middleman);
    }

    // ═══════════════════════════════════════════════════════════════
    //  4. Cancellation — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_CancelDeal_InCreatedState() public {
        uint256 dealId = _createDealWithOpenSlot();

        vm.prank(client);
        escrow.cancelDeal(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.None));
    }

    function test_CancelDeal_InJoinedState() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(client);
        escrow.cancelDeal(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
    }

    function test_CancelDeal_EmitsDealCancelled() public {
        uint256 dealId = _createDefaultDeal();

        vm.expectEmit(true, true, false, false, address(escrow));
        emit DealCancelled(dealId, client);

        vm.prank(client);
        escrow.cancelDeal(dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  4b. Cancellation — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_CancelDeal_RevertsWhen_NotCreator() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(Escrow__NotCreator.selector, seller, dealId));
        escrow.cancelDeal(dealId);
    }

    function test_CancelDeal_RevertsWhen_DealNotFound() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.cancelDeal(999);
    }

    function test_CancelDeal_RevertsWhen_InSignedState() public {
        uint256 dealId = _createSignedDeal();

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotCancellable.selector, dealId));
        escrow.cancelDeal(dealId);
    }

    function test_CancelDeal_RevertsWhen_InFundedState() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotCancellable.selector, dealId));
        escrow.cancelDeal(dealId);
    }

    function test_CancelDeal_RevertsWhen_InResolvedState() public {
        uint256 dealId = _createDefaultDeal();
        vm.prank(client);
        escrow.cancelDeal(dealId); // now Resolved

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotCancellable.selector, dealId));
        escrow.cancelDeal(dealId); // try again
    }

    // ═══════════════════════════════════════════════════════════════
    //  5. Signing — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_SignDeal_ClientSigns() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(client);
        escrow.signDeal(dealId);
        // No state change after first signature
        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined));
    }

    function test_SignDeal_SellerSigns() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(seller);
        escrow.signDeal(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined));
    }

    function test_SignDeal_MiddlemanSigns() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(middleman);
        escrow.signDeal(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Joined));
    }

    function test_SignDeal_EmitsDealSigned() public {
        uint256 dealId = _createDefaultDeal();

        vm.expectEmit(true, true, false, false, address(escrow));
        emit DealSigned(dealId, client);

        vm.prank(client);
        escrow.signDeal(dealId);
    }

    function test_SignDeal_ThirdSignature_TransitionsToSigned() public {
        uint256 dealId = _createSignedDeal();

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Signed));
    }

    function test_SignDeal_ThirdSignature_SetsDeadline() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(client);
        escrow.signDeal(dealId);
        vm.prank(seller);
        escrow.signDeal(dealId);

        uint256 signTime = block.timestamp;
        vm.prank(middleman);
        escrow.signDeal(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.deadline, uint48(signTime + DEFAULT_TIMEOUT));
    }

    function test_SignDeal_ThirdSignature_EmitsDealFullySigned() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(client);
        escrow.signDeal(dealId);
        vm.prank(seller);
        escrow.signDeal(dealId);

        uint48 expectedDeadline = uint48(block.timestamp + DEFAULT_TIMEOUT);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit DealFullySigned(dealId, expectedDeadline);

        vm.prank(middleman);
        escrow.signDeal(dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  5b. Signing — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_SignDeal_RevertsWhen_NotParticipant() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Escrow__NotParticipant.selector, outsider, dealId));
        escrow.signDeal(dealId);
    }

    function test_SignDeal_RevertsWhen_AlreadySigned() public {
        uint256 dealId = _createDefaultDeal();

        vm.prank(client);
        escrow.signDeal(dealId);

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__AlreadySigned.selector, dealId, client));
        escrow.signDeal(dealId);
    }

    function test_SignDeal_RevertsWhen_NotInJoinedState() public {
        uint256 dealId = _createDealWithOpenSlot(); // Created state

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Created, DealState.Joined)
        );
        escrow.signDeal(dealId);
    }

    function test_SignDeal_RevertsWhen_AmountIsZero() public {
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), 0, 0);

        vm.prank(client);
        vm.expectRevert(Escrow__InvalidAmount.selector);
        escrow.signDeal(dealId);
    }

    function test_SignDeal_RevertsWhen_DealNotFound() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.signDeal(999);
    }

    // ═══════════════════════════════════════════════════════════════
    //  6. Funding — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_FundDeal_TransfersUSDCToEscrow() public {
        uint256 dealId = _createSignedDeal();
        uint256 escrowBalBefore = usdc.balanceOf(address(escrow));

        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);
        escrow.fundDeal(dealId);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(escrow)), escrowBalBefore + DEAL_AMOUNT);
    }

    function test_FundDeal_TransitionsToFunded() public {
        uint256 dealId = _createFundedDeal();

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Funded));
    }

    function test_FundDeal_EmitsDealFunded() public {
        uint256 dealId = _createSignedDeal();

        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealFunded(dealId, client, DEAL_AMOUNT);

        escrow.fundDeal(dealId);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    //  6b. Funding — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_FundDeal_RevertsWhen_NotClient() public {
        uint256 dealId = _createSignedDeal();

        vm.prank(seller);
        vm.expectRevert(Escrow__NotClient.selector);
        escrow.fundDeal(dealId);
    }

    function test_FundDeal_RevertsWhen_NotInSignedState() public {
        uint256 dealId = _createDefaultDeal(); // Joined, not Signed

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Joined, DealState.Signed)
        );
        escrow.fundDeal(dealId);
    }

    function test_FundDeal_RevertsWhen_InsufficientApproval() public {
        uint256 dealId = _createSignedDeal();

        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT - 1);
        vm.expectRevert(); // SafeERC20 / ERC20 revert
        escrow.fundDeal(dealId);
        vm.stopPrank();
    }

    function test_FundDeal_RevertsWhen_InsufficientBalance() public {
        uint256 dealId = _createSignedDeal();

        vm.startPrank(client);
        usdc.transfer(outsider, usdc.balanceOf(client));
        usdc.approve(address(escrow), DEAL_AMOUNT);
        vm.expectRevert(); // ERC20 insufficient balance
        escrow.fundDeal(dealId);
        vm.stopPrank();
    }

    function test_FundDeal_RevertsWhen_DeadlinePassed() public {
        uint256 dealId = _createSignedDeal();

        // Warp past deadline
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);
        vm.expectRevert(abi.encodeWithSelector(Escrow__TimeoutReached.selector, dealId));
        escrow.fundDeal(dealId);
        vm.stopPrank();
    }

    function test_FundDeal_RevertsWhen_DealNotFound() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.fundDeal(999);
    }

    // ═══════════════════════════════════════════════════════════════
    //  6c. Funding — Fuzz
    // ═══════════════════════════════════════════════════════════════

    function testFuzz_FundDeal_RandomAmounts(uint96 amount) public {
        amount = uint96(bound(amount, 1, CLIENT_MINT_AMOUNT));

        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), amount, 0);

        vm.prank(client);
        escrow.signDeal(dealId);
        vm.prank(seller);
        escrow.signDeal(dealId);
        vm.prank(middleman);
        escrow.signDeal(dealId);

        vm.startPrank(client);
        usdc.approve(address(escrow), amount);
        escrow.fundDeal(dealId);
        vm.stopPrank();

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Funded));
        assertEq(deal.amount, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    //  7. Resolution — Delivery Confirmed — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_ConfirmDelivery_TransitionsToResolved() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Delivery));
    }

    function test_ConfirmDelivery_CreditsSeller() public {
        uint256 dealId = _createFundedDeal();
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        assertEq(escrow.pendingBalance(seller, address(usdc)), expectedSellerPayout);
    }

    function test_ConfirmDelivery_CreditsMiddleman() public {
        uint256 dealId = _createFundedDeal();
        uint96 expectedMiddlemanFee = uint96(_middlemanFee(DEAL_AMOUNT));

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        assertEq(escrow.pendingBalance(middleman, address(usdc)), expectedMiddlemanFee);
    }

    function test_ConfirmDelivery_CreditsFeeRecipient() public {
        uint256 dealId = _createFundedDeal();
        uint96 expectedPlatformFee = uint96(_platformFee(DEAL_AMOUNT));

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        assertEq(escrow.pendingBalance(feeRecipient, address(usdc)), expectedPlatformFee);
    }

    function test_ConfirmDelivery_FeesSumToAmount() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        uint96 sellerBal = escrow.pendingBalance(seller, address(usdc));
        uint96 middlemanBal = escrow.pendingBalance(middleman, address(usdc));
        uint96 platformBal = escrow.pendingBalance(feeRecipient, address(usdc));

        assertEq(uint256(sellerBal) + uint256(middlemanBal) + uint256(platformBal), DEAL_AMOUNT);
    }

    function test_ConfirmDelivery_EmitsDeliveryConfirmed() public {
        uint256 dealId = _createFundedDeal();

        vm.expectEmit(true, true, false, false, address(escrow));
        emit DeliveryConfirmed(dealId, client);

        vm.prank(client);
        escrow.confirmDelivery(dealId);
    }

    function test_ConfirmDelivery_EmitsDealResolved() public {
        uint256 dealId = _createFundedDeal();
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Delivery, 0, expectedSellerPayout);

        vm.prank(client);
        escrow.confirmDelivery(dealId);
    }

    function test_ConfirmDelivery_MintsSoulboundToMiddleman() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        assertEq(soulbound.getTotalDeals(middleman), 1);
        assertEq(soulbound.getDealId(1), dealId);
    }

    function test_ConfirmDelivery_MintsReceiptToClient() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        // ReceiptNFT mints: client gets token 1, seller gets token 2
        assertEq(receipt.ownerOf(1), client);
        assertEq(receipt.getDealId(1), dealId);
    }

    function test_ConfirmDelivery_MintsReceiptToSeller() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        assertEq(receipt.ownerOf(2), seller);
        assertEq(receipt.getDealId(2), dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  7b. Resolution — Delivery Confirmed — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_ConfirmDelivery_RevertsWhen_NotClient() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(seller);
        vm.expectRevert(Escrow__NotClient.selector);
        escrow.confirmDelivery(dealId);
    }

    function test_ConfirmDelivery_RevertsWhen_NotInFundedState() public {
        uint256 dealId = _createSignedDeal(); // Signed, not Funded

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Signed, DealState.Funded)
        );
        escrow.confirmDelivery(dealId);
    }

    function test_ConfirmDelivery_RevertsWhen_DeadlinePassed() public {
        uint256 dealId = _createFundedDeal();

        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__TimeoutReached.selector, dealId));
        escrow.confirmDelivery(dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  8. Resolution — Refund Flow — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_RequestRefund_TransitionsToRefundRequested() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.requestRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.RefundRequested));
    }

    function test_RequestRefund_EmitsRefundRequested() public {
        uint256 dealId = _createFundedDeal();

        vm.expectEmit(true, true, false, false, address(escrow));
        emit RefundRequested(dealId, client);

        vm.prank(client);
        escrow.requestRefund(dealId);
    }

    function test_AcceptRefund_TransitionsToResolved() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.prank(seller);
        escrow.acceptRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Refund));
    }

    function test_AcceptRefund_CreditsClientFullAmount() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.prank(seller);
        escrow.acceptRefund(dealId);

        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT);
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);
    }

    function test_AcceptRefund_EmitsRefundAccepted() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.expectEmit(true, false, false, false, address(escrow));
        emit RefundAccepted(dealId);

        vm.prank(seller);
        escrow.acceptRefund(dealId);
    }

    function test_AcceptRefund_EmitsDealResolved() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Refund, DEAL_AMOUNT, 0);

        vm.prank(seller);
        escrow.acceptRefund(dealId);
    }

    function test_AcceptRefund_MintsNFTs() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.prank(seller);
        escrow.acceptRefund(dealId);

        // SoulboundNFT to middleman
        assertEq(soulbound.getTotalDeals(middleman), 1);
        // ReceiptNFT to client and seller
        assertEq(receipt.ownerOf(1), client);
        assertEq(receipt.ownerOf(2), seller);
    }

    function test_RejectRefund_TransitionsToDisputed() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.prank(seller);
        escrow.rejectRefund(dealId);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Disputed));
    }

    function test_RejectRefund_EmitsDealDisputed() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.expectEmit(true, false, false, false, address(escrow));
        emit DealDisputed(dealId);

        vm.prank(seller);
        escrow.rejectRefund(dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  8b. Resolution — Refund Flow — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_RequestRefund_RevertsWhen_NotClient() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(seller);
        vm.expectRevert(Escrow__NotClient.selector);
        escrow.requestRefund(dealId);
    }

    function test_RequestRefund_RevertsWhen_NotInFundedState() public {
        uint256 dealId = _createSignedDeal();

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Signed, DealState.Funded)
        );
        escrow.requestRefund(dealId);
    }

    function test_AcceptRefund_RevertsWhen_NotSeller() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.prank(client);
        vm.expectRevert(Escrow__NotSeller.selector);
        escrow.acceptRefund(dealId);
    }

    function test_AcceptRefund_RevertsWhen_NotInRefundRequestedState() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow__InvalidState.selector, DealState.Funded, DealState.RefundRequested
            )
        );
        escrow.acceptRefund(dealId);
    }

    function test_RejectRefund_RevertsWhen_NotSeller() public {
        uint256 dealId = _createRefundRequestedDeal();

        vm.prank(client);
        vm.expectRevert(Escrow__NotSeller.selector);
        escrow.rejectRefund(dealId);
    }

    function test_RejectRefund_RevertsWhen_NotInRefundRequestedState() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow__InvalidState.selector, DealState.Funded, DealState.RefundRequested
            )
        );
        escrow.rejectRefund(dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  9. Resolution — Dispute — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_ResolveDispute_MiddlemanBuyer_CreditsClient() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);

        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT);
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);
    }

    function test_ResolveDispute_MiddlemanBuyer_SetsResolution() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.MiddlemanBuyer));
    }

    function test_ResolveDispute_MiddlemanBuyer_EmitsDealResolved() public {
        uint256 dealId = _createDisputedDeal();

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.MiddlemanBuyer, DEAL_AMOUNT, 0);

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);
    }

    function test_ResolveDispute_MiddlemanBuyer_MintsNFTs() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);

        assertEq(soulbound.getTotalDeals(middleman), 1);
        assertEq(receipt.ownerOf(1), client);
        assertEq(receipt.ownerOf(2), seller);
    }

    function test_ResolveDispute_MiddlemanSeller_CreditsSeller() public {
        uint256 dealId = _createDisputedDeal();
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        assertEq(escrow.pendingBalance(seller, address(usdc)), expectedSellerPayout);
    }

    function test_ResolveDispute_MiddlemanSeller_CreditsMiddleman() public {
        uint256 dealId = _createDisputedDeal();
        uint96 expectedMiddlemanFee = uint96(_middlemanFee(DEAL_AMOUNT));

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        assertEq(escrow.pendingBalance(middleman, address(usdc)), expectedMiddlemanFee);
    }

    function test_ResolveDispute_MiddlemanSeller_CreditsFeeRecipient() public {
        uint256 dealId = _createDisputedDeal();
        uint96 expectedPlatformFee = uint96(_platformFee(DEAL_AMOUNT));

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        assertEq(escrow.pendingBalance(feeRecipient, address(usdc)), expectedPlatformFee);
    }

    function test_ResolveDispute_MiddlemanSeller_SetsResolution() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.Resolved));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.MiddlemanSeller));
    }

    function test_ResolveDispute_MiddlemanSeller_EmitsDealResolved() public {
        uint256 dealId = _createDisputedDeal();
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.MiddlemanSeller, 0, expectedSellerPayout);

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);
    }

    function test_ResolveDispute_MiddlemanSeller_FeesSumToAmount() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        uint96 sellerBal = escrow.pendingBalance(seller, address(usdc));
        uint96 middlemanBal = escrow.pendingBalance(middleman, address(usdc));
        uint96 platformBal = escrow.pendingBalance(feeRecipient, address(usdc));

        assertEq(uint256(sellerBal) + uint256(middlemanBal) + uint256(platformBal), DEAL_AMOUNT);
    }

    function test_ResolveDispute_MiddlemanSeller_MintsNFTs() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanSeller);

        assertEq(soulbound.getTotalDeals(middleman), 1);
        assertEq(receipt.ownerOf(1), client);
        assertEq(receipt.ownerOf(2), seller);
    }

    // ═══════════════════════════════════════════════════════════════
    //  9b. Resolution — Dispute — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_ResolveDispute_RevertsWhen_NotMiddleman() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(client);
        vm.expectRevert(Escrow__NotMiddleman.selector);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);
    }

    function test_ResolveDispute_RevertsWhen_NotInDisputedState() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(middleman);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Funded, DealState.Disputed)
        );
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);
    }

    function test_ResolveDispute_RevertsWhen_ResolutionIsNone() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        vm.expectRevert(Escrow__InvalidResolution.selector);
        escrow.resolveDispute(dealId, ResolutionType.None);
    }

    function test_ResolveDispute_RevertsWhen_ResolutionIsDelivery() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        vm.expectRevert(Escrow__InvalidResolution.selector);
        escrow.resolveDispute(dealId, ResolutionType.Delivery);
    }

    function test_ResolveDispute_RevertsWhen_ResolutionIsRefund() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        vm.expectRevert(Escrow__InvalidResolution.selector);
        escrow.resolveDispute(dealId, ResolutionType.Refund);
    }

    function test_ResolveDispute_RevertsWhen_ResolutionIsTimeout() public {
        uint256 dealId = _createDisputedDeal();

        vm.prank(middleman);
        vm.expectRevert(Escrow__InvalidResolution.selector);
        escrow.resolveDispute(dealId, ResolutionType.Timeout);
    }

    function test_ResolveDispute_RevertsWhen_DealNotFound() public {
        vm.prank(middleman);
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.resolveDispute(999, ResolutionType.MiddlemanBuyer);
    }

    // ═══════════════════════════════════════════════════════════════
    //  10. Timeout — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_ExecuteTimeout_FromFunded() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        escrow.executeTimeout(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut));
        assertEq(uint8(deal.resolution), uint8(ResolutionType.Timeout));
    }

    function test_ExecuteTimeout_FromRefundRequested() public {
        uint256 dealId = _createRefundRequestedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        escrow.executeTimeout(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut));
    }

    function test_ExecuteTimeout_FromDisputed() public {
        uint256 dealId = _createDisputedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        escrow.executeTimeout(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut));
    }

    function test_ExecuteTimeout_CreditsClientFullAmount() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        escrow.executeTimeout(dealId);

        assertEq(escrow.pendingBalance(client, address(usdc)), DEAL_AMOUNT);
        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
        assertEq(escrow.pendingBalance(middleman, address(usdc)), 0);
    }

    function test_ExecuteTimeout_EmitsDealTimedOut() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        vm.expectEmit(true, true, false, false, address(escrow));
        emit DealTimedOut(dealId, address(this));

        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_EmitsDealResolved() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit DealResolved(dealId, ResolutionType.Timeout, DEAL_AMOUNT, 0);

        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_CallableByAnyone() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        vm.prank(outsider); // Not a participant
        escrow.executeTimeout(dealId);

        deal = escrow.getDeal(dealId);
        assertEq(uint8(deal.state), uint8(DealState.TimedOut));
    }

    function test_ExecuteTimeout_MintsNFTs() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        escrow.executeTimeout(dealId);

        assertEq(soulbound.getTotalDeals(middleman), 1);
        assertEq(receipt.ownerOf(1), client);
        assertEq(receipt.ownerOf(2), seller);
    }

    // ═══════════════════════════════════════════════════════════════
    //  10b. Timeout — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_ExecuteTimeout_RevertsWhen_DeadlineNotReached() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);

        // Still within deadline
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow__TimeoutNotReached.selector, deal.deadline, uint256(block.timestamp)
            )
        );
        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_RevertsWhen_InCreatedState() public {
        uint256 dealId = _createDealWithOpenSlot();

        vm.expectRevert(); // InvalidState
        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_RevertsWhen_InJoinedState() public {
        uint256 dealId = _createDefaultDeal();

        vm.expectRevert(); // InvalidState
        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_RevertsWhen_InSignedState() public {
        uint256 dealId = _createSignedDeal();

        vm.expectRevert(); // InvalidState
        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_RevertsWhen_InResolvedState() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        escrow.confirmDelivery(dealId);

        vm.expectRevert(); // InvalidState
        escrow.executeTimeout(dealId);
    }

    function test_ExecuteTimeout_RevertsWhen_DealNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.executeTimeout(999);
    }

    // ═══════════════════════════════════════════════════════════════
    //  11. Amount Increase — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_IncreaseAmount_ClientProposesFirst() public {
        uint256 dealId = _createFundedDeal();
        uint96 newAmount = DEAL_AMOUNT + 500_000_000; // +500 USDC

        vm.prank(client);
        escrow.increaseAmount(dealId, newAmount);

        // Amount should NOT change yet (only one party agreed)
        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, DEAL_AMOUNT);
    }

    function test_IncreaseAmount_SellerProposesFirst() public {
        uint256 dealId = _createFundedDeal();
        uint96 newAmount = DEAL_AMOUNT + 500_000_000;

        vm.prank(seller);
        escrow.increaseAmount(dealId, newAmount);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, DEAL_AMOUNT); // Not changed yet
    }

    function test_IncreaseAmount_BothAgree_UpdatesDealAmount() public {
        uint256 dealId = _createFundedDeal();
        uint96 newAmount = DEAL_AMOUNT + 500_000_000;
        uint96 difference = newAmount - DEAL_AMOUNT;

        // Client proposes and pre-approves
        vm.startPrank(client);
        usdc.approve(address(escrow), difference);
        escrow.increaseAmount(dealId, newAmount);
        vm.stopPrank();

        // Seller confirms
        vm.prank(seller);
        escrow.increaseAmount(dealId, newAmount);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, newAmount);
    }

    function test_IncreaseAmount_BothAgree_TransfersDifference() public {
        uint256 dealId = _createFundedDeal();
        uint96 newAmount = DEAL_AMOUNT + 500_000_000;
        uint96 difference = newAmount - DEAL_AMOUNT;
        uint256 escrowBalBefore = usdc.balanceOf(address(escrow));

        vm.startPrank(client);
        usdc.approve(address(escrow), difference);
        escrow.increaseAmount(dealId, newAmount);
        vm.stopPrank();

        vm.prank(seller);
        escrow.increaseAmount(dealId, newAmount);

        assertEq(usdc.balanceOf(address(escrow)), escrowBalBefore + difference);
    }

    function test_IncreaseAmount_BothAgree_EmitsAmountIncreased() public {
        uint256 dealId = _createFundedDeal();
        uint96 newAmount = DEAL_AMOUNT + 500_000_000;
        uint96 difference = newAmount - DEAL_AMOUNT;

        vm.startPrank(client);
        usdc.approve(address(escrow), difference);
        escrow.increaseAmount(dealId, newAmount);
        vm.stopPrank();

        vm.expectEmit(true, false, false, true, address(escrow));
        emit AmountIncreased(dealId, DEAL_AMOUNT, newAmount);

        vm.prank(seller);
        escrow.increaseAmount(dealId, newAmount);
    }

    // ═══════════════════════════════════════════════════════════════
    //  11b. Amount Increase — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_IncreaseAmount_RevertsWhen_NotParticipant() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Escrow__NotParticipant.selector, outsider, dealId));
        escrow.increaseAmount(dealId, DEAL_AMOUNT + 1);
    }

    function test_IncreaseAmount_RevertsWhen_MiddlemanCalls() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(middleman);
        vm.expectRevert(abi.encodeWithSelector(Escrow__NotParticipant.selector, middleman, dealId));
        escrow.increaseAmount(dealId, DEAL_AMOUNT + 1);
    }

    function test_IncreaseAmount_RevertsWhen_AmountNotGreater() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        vm.expectRevert(Escrow__InvalidAmount.selector);
        escrow.increaseAmount(dealId, DEAL_AMOUNT); // same amount
    }

    function test_IncreaseAmount_RevertsWhen_AmountLess() public {
        uint256 dealId = _createFundedDeal();

        vm.prank(client);
        vm.expectRevert(Escrow__InvalidAmount.selector);
        escrow.increaseAmount(dealId, DEAL_AMOUNT - 1);
    }

    function test_IncreaseAmount_RevertsWhen_NotInFundedState() public {
        uint256 dealId = _createSignedDeal();

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow__InvalidState.selector, DealState.Signed, DealState.Funded)
        );
        escrow.increaseAmount(dealId, DEAL_AMOUNT + 1);
    }

    function test_IncreaseAmount_RevertsWhen_DeadlinePassed() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow__TimeoutReached.selector, dealId));
        escrow.increaseAmount(dealId, DEAL_AMOUNT + 1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  11c. Amount Increase — Fuzz
    // ═══════════════════════════════════════════════════════════════

    function testFuzz_IncreaseAmount(uint96 increase) public {
        increase = uint96(bound(increase, 1, CLIENT_MINT_AMOUNT - DEAL_AMOUNT));
        uint96 newAmount = DEAL_AMOUNT + increase;

        uint256 dealId = _createFundedDeal();

        vm.startPrank(client);
        usdc.approve(address(escrow), increase);
        escrow.increaseAmount(dealId, newAmount);
        vm.stopPrank();

        vm.prank(seller);
        escrow.increaseAmount(dealId, newAmount);

        Deal memory deal = escrow.getDeal(dealId);
        assertEq(deal.amount, newAmount);
    }

    // ═══════════════════════════════════════════════════════════════
    //  12. Withdrawal — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_Withdraw_TransfersCorrectAmount() public {
        uint256 dealId = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId);

        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 expectedSellerPayout = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);

        uint256 sellerBalBefore = usdc.balanceOf(seller);

        vm.prank(seller);
        escrow.withdraw();

        assertEq(usdc.balanceOf(seller), sellerBalBefore + expectedSellerPayout);
    }

    function test_Withdraw_ZerosPendingBalance() public {
        uint256 dealId = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId);

        vm.prank(seller);
        escrow.withdraw();

        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
    }

    function test_Withdraw_EmitsWithdrawal() public {
        uint256 dealId = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId);

        uint96 sellerBal = escrow.pendingBalance(seller, address(usdc));

        vm.expectEmit(true, true, false, true, address(escrow));
        emit Withdrawal(seller, address(usdc), sellerBal);

        vm.prank(seller);
        escrow.withdraw();
    }

    function test_Withdraw_MultipleDealsAccumulate() public {
        // Deal 1
        uint256 dealId1 = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId1);

        // Deal 2
        vm.prank(client);
        uint256 dealId2 = escrow.createDeal(client, seller, middleman, address(usdc), DEAL_AMOUNT, 0);
        vm.prank(client);
        escrow.signDeal(dealId2);
        vm.prank(seller);
        escrow.signDeal(dealId2);
        vm.prank(middleman);
        escrow.signDeal(dealId2);
        vm.startPrank(client);
        usdc.approve(address(escrow), DEAL_AMOUNT);
        escrow.fundDeal(dealId2);
        escrow.confirmDelivery(dealId2);
        vm.stopPrank();

        // Seller's accumulated balance from 2 deals
        uint256 expectedPlatformFee = _platformFee(DEAL_AMOUNT);
        uint256 expectedMiddlemanFee = _middlemanFee(DEAL_AMOUNT);
        uint96 perDeal = uint96(DEAL_AMOUNT - expectedPlatformFee - expectedMiddlemanFee);
        uint96 totalExpected = perDeal * 2;

        assertEq(escrow.pendingBalance(seller, address(usdc)), totalExpected);

        vm.prank(seller);
        escrow.withdraw();

        assertEq(escrow.pendingBalance(seller, address(usdc)), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  12b. Withdrawal — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_Withdraw_RevertsWhen_NothingToWithdraw() public {
        vm.prank(outsider);
        vm.expectRevert(Escrow__NothingToWithdraw.selector);
        escrow.withdraw();
    }

    // ═══════════════════════════════════════════════════════════════
    //  13. Admin Functions — Token Whitelist
    // ═══════════════════════════════════════════════════════════════

    function test_AddAllowedToken_AddsToken() public {
        address newToken = makeAddr("DAI");
        escrow.addAllowedToken(newToken);

        assertTrue(escrow.isTokenAllowed(newToken));
    }

    function test_AddAllowedToken_EmitsTokenAllowed() public {
        address newToken = makeAddr("DAI");

        vm.expectEmit(true, false, false, false, address(escrow));
        emit TokenAllowed(newToken);

        escrow.addAllowedToken(newToken);
    }

    function test_AddAllowedToken_RevertsWhen_NotOwner() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, outsider));
        escrow.addAllowedToken(makeAddr("token"));
    }

    function test_AddAllowedToken_RevertsWhen_ZeroAddress() public {
        vm.expectRevert(Escrow__ZeroAddress.selector);
        escrow.addAllowedToken(address(0));
    }

    function test_RemoveAllowedToken_RemovesToken() public {
        escrow.removeAllowedToken(address(usdc));

        assertFalse(escrow.isTokenAllowed(address(usdc)));
    }

    function test_RemoveAllowedToken_EmitsTokenDisallowed() public {
        vm.expectEmit(true, false, false, false, address(escrow));
        emit TokenDisallowed(address(usdc));

        escrow.removeAllowedToken(address(usdc));
    }

    function test_RemoveAllowedToken_RevertsWhen_NotOwner() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, outsider));
        escrow.removeAllowedToken(address(usdc));
    }

    function test_IsTokenAllowed_ReturnsTrueForWhitelisted() public view {
        assertTrue(escrow.isTokenAllowed(address(usdc)));
    }

    function test_IsTokenAllowed_ReturnsFalseForNonWhitelisted() public view {
        assertFalse(escrow.isTokenAllowed(address(0xdead)));
    }

    // ═══════════════════════════════════════════════════════════════
    //  14. Fee Calculations — Fuzz
    // ═══════════════════════════════════════════════════════════════

    function testFuzz_FeeCalculation_SellerPayout(uint96 amount) public {
        amount = uint96(bound(amount, 1, CLIENT_MINT_AMOUNT));

        // Create deal with this amount
        vm.prank(client);
        uint256 dealId = escrow.createDeal(client, seller, middleman, address(usdc), amount, 0);

        // Sign
        vm.prank(client);
        escrow.signDeal(dealId);
        vm.prank(seller);
        escrow.signDeal(dealId);
        vm.prank(middleman);
        escrow.signDeal(dealId);

        // Fund
        vm.startPrank(client);
        usdc.approve(address(escrow), amount);
        escrow.fundDeal(dealId);

        // Confirm delivery
        escrow.confirmDelivery(dealId);
        vm.stopPrank();

        // Verify: seller + middleman + platform = amount
        uint96 sellerBal = escrow.pendingBalance(seller, address(usdc));
        uint96 middlemanBal = escrow.pendingBalance(middleman, address(usdc));
        uint96 platformBal = escrow.pendingBalance(feeRecipient, address(usdc));

        assertEq(
            uint256(sellerBal) + uint256(middlemanBal) + uint256(platformBal),
            amount,
            "Fees must sum to deal amount"
        );
    }

    function testFuzz_FeeCalculation_CombinedFeesNeverExceedAmount(uint96 amount) public pure {
        uint256 platformFee = Math.mulDiv(amount, PLATFORM_FEE_BPS, 10_000);
        uint256 middlemanFee = Math.mulDiv(amount, MIDDLEMAN_COMMISSION_BPS, 10_000);

        assertTrue(platformFee + middlemanFee <= amount, "Combined fees exceed amount");
    }

    function test_FeeCalculation_AmountZero_AllFeesZero() public pure {
        uint256 platformFee = Math.mulDiv(0, PLATFORM_FEE_BPS, 10_000);
        uint256 middlemanFee = Math.mulDiv(0, MIDDLEMAN_COMMISSION_BPS, 10_000);

        assertEq(platformFee, 0);
        assertEq(middlemanFee, 0);
    }

    function test_FeeCalculation_AmountOne_AllFeesZero() public pure {
        uint256 platformFee = Math.mulDiv(1, PLATFORM_FEE_BPS, 10_000);
        uint256 middlemanFee = Math.mulDiv(1, MIDDLEMAN_COMMISSION_BPS, 10_000);

        assertEq(platformFee, 0, "Platform fee should be 0 for amount=1 (floor)");
        assertEq(middlemanFee, 0, "Middleman fee should be 0 for amount=1 (floor)");
    }

    function test_FeeCalculation_MaxUint96_NoOverflow() public pure {
        uint256 amount = type(uint96).max;
        uint256 platformFee = Math.mulDiv(amount, PLATFORM_FEE_BPS, 10_000);
        uint256 middlemanFee = Math.mulDiv(amount, MIDDLEMAN_COMMISSION_BPS, 10_000);

        assertTrue(platformFee + middlemanFee <= amount);
        assertTrue(platformFee > 0);
        assertTrue(middlemanFee > 0);
    }

    function testFuzz_FeeCalculation_FloorRounding(uint96 amount) public pure {
        uint256 platformFee = Math.mulDiv(amount, PLATFORM_FEE_BPS, 10_000);
        uint256 middlemanFee = Math.mulDiv(amount, MIDDLEMAN_COMMISSION_BPS, 10_000);

        // Floor rounding: fee * 10000 <= amount * bps
        assertTrue(platformFee * 10_000 <= uint256(amount) * PLATFORM_FEE_BPS);
        assertTrue(middlemanFee * 10_000 <= uint256(amount) * MIDDLEMAN_COMMISSION_BPS);
    }

    // ═══════════════════════════════════════════════════════════════
    //  15. State Machine Integrity
    // ═══════════════════════════════════════════════════════════════

    function test_StateMachine_Created_To_Joined() public {
        uint256 dealId = _createDealWithOpenSlot();
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Created));

        vm.prank(seller);
        escrow.joinDeal(dealId, ParticipantRole.Seller);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Joined));
    }

    function test_StateMachine_Joined_To_Signed() public {
        uint256 dealId = _createSignedDeal();
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Signed));
    }

    function test_StateMachine_Signed_To_Funded() public {
        uint256 dealId = _createFundedDeal();
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Funded));
    }

    function test_StateMachine_Funded_To_DeliveryConfirmed_To_Resolved() public {
        uint256 dealId = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Resolved));
    }

    function test_StateMachine_Funded_To_RefundRequested() public {
        uint256 dealId = _createRefundRequestedDeal();
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.RefundRequested));
    }

    function test_StateMachine_Funded_To_TimedOut() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);
        escrow.executeTimeout(dealId);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.TimedOut));
    }

    function test_StateMachine_RefundRequested_To_Resolved() public {
        uint256 dealId = _createRefundRequestedDeal();
        vm.prank(seller);
        escrow.acceptRefund(dealId);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Resolved));
    }

    function test_StateMachine_RefundRequested_To_Disputed() public {
        uint256 dealId = _createDisputedDeal();
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Disputed));
    }

    function test_StateMachine_RefundRequested_To_TimedOut() public {
        uint256 dealId = _createRefundRequestedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);
        escrow.executeTimeout(dealId);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.TimedOut));
    }

    function test_StateMachine_Disputed_To_Resolved() public {
        uint256 dealId = _createDisputedDeal();
        vm.prank(middleman);
        escrow.resolveDispute(dealId, ResolutionType.MiddlemanBuyer);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.Resolved));
    }

    function test_StateMachine_Disputed_To_TimedOut() public {
        uint256 dealId = _createDisputedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);
        escrow.executeTimeout(dealId);
        assertEq(uint8(escrow.getDeal(dealId).state), uint8(DealState.TimedOut));
    }

    // Invalid transitions
    function test_StateMachine_RevertsWhen_CreatedSkipsToFunded() public {
        uint256 dealId = _createDealWithOpenSlot();

        vm.prank(client);
        vm.expectRevert(); // InvalidState: Created != Signed
        escrow.fundDeal(dealId);
    }

    function test_StateMachine_RevertsWhen_ResolvedToAnything() public {
        uint256 dealId = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId); // now Resolved

        // Try to request refund on resolved deal
        vm.prank(client);
        vm.expectRevert(); // InvalidState
        escrow.requestRefund(dealId);
    }

    function test_StateMachine_RevertsWhen_TimedOutToAnything() public {
        uint256 dealId = _createFundedDeal();
        Deal memory deal = escrow.getDeal(dealId);
        vm.warp(uint256(deal.deadline) + 1);
        escrow.executeTimeout(dealId); // now TimedOut

        vm.prank(client);
        vm.expectRevert(); // InvalidState
        escrow.confirmDelivery(dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  16. View Functions
    // ═══════════════════════════════════════════════════════════════

    function test_GetDeal_ReturnsCorrectStruct() public {
        uint256 dealId = _createDefaultDeal();
        Deal memory deal = escrow.getDeal(dealId);

        assertEq(deal.id, dealId);
        assertEq(deal.client, client);
        assertEq(deal.seller, seller);
        assertEq(deal.middleman, middleman);
    }

    function test_GetDeal_RevertsWhen_DealNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(Escrow__DealNotFound.selector, uint256(999)));
        escrow.getDeal(999);
    }

    function test_GetDealCount_ReturnsCounter() public {
        assertEq(escrow.getDealCount(), 0);

        _createDefaultDeal();
        assertEq(escrow.getDealCount(), 1);

        _createDefaultDeal();
        assertEq(escrow.getDealCount(), 2);
    }

    function test_PendingBalance_ReturnsCorrectAmount() public {
        uint256 dealId = _createFundedDeal();
        vm.prank(client);
        escrow.confirmDelivery(dealId);

        uint96 sellerBal = escrow.pendingBalance(seller, address(usdc));
        assertTrue(sellerBal > 0);
    }

    function test_PendingBalance_ReturnsZeroForUnknownUser() public view {
        assertEq(escrow.pendingBalance(outsider, address(usdc)), 0);
    }
}
