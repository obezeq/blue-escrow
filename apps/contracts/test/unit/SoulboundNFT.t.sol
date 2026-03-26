// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Test } from "forge-std/Test.sol";
import { SoulboundNFT } from "../../src/tokens/SoulboundNFT.sol";
import { ISoulboundNFT } from "../../src/interfaces/ISoulboundNFT.sol";
import { IERC5192 } from "../../src/interfaces/IERC5192.sol";
import { NFT__TransferDisabled, NFT__NotAuthorized, NFT__AlreadyMinted } from "../../src/utils/Errors.sol";
import { SoulboundNFTMinted } from "../../src/utils/Events.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/// @title SoulboundNFTTest
/// @notice Unit + fuzz tests for the SoulboundNFT contract (TDD — RED phase)
contract SoulboundNFTTest is Test {
    SoulboundNFT internal sbt;

    address internal escrow = makeAddr("escrow");
    address internal middleman = makeAddr("middleman");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant DEAL_ID_1 = 1;
    uint256 internal constant DEAL_ID_2 = 2;

    event Locked(uint256 tokenId);

    function setUp() public {
        sbt = new SoulboundNFT(escrow);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Minting — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_Mint_ByEscrow() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        assertEq(sbt.ownerOf(tokenId), middleman);
        assertEq(tokenId, 1);
    }

    function test_Mint_IncrementsBalance() public {
        vm.startPrank(escrow);
        sbt.mint(middleman, DEAL_ID_1);
        sbt.mint(middleman, DEAL_ID_2);
        vm.stopPrank();

        assertEq(sbt.balanceOf(middleman), 2);
    }

    function test_Mint_AutoIncrementsTokenId() public {
        vm.startPrank(escrow);
        uint256 id1 = sbt.mint(middleman, DEAL_ID_1);
        uint256 id2 = sbt.mint(alice, DEAL_ID_2);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_Mint_StoresDealId() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        assertEq(sbt.getDealId(tokenId), DEAL_ID_1);
    }

    function test_Mint_EmitsSoulboundNFTMinted() public {
        vm.expectEmit(true, true, true, true, address(sbt));
        emit SoulboundNFTMinted(1, middleman, DEAL_ID_1);

        vm.prank(escrow);
        sbt.mint(middleman, DEAL_ID_1);
    }

    function test_Mint_EmitsLockedEvent() public {
        vm.expectEmit(true, false, false, false, address(sbt));
        emit Locked(1);

        vm.prank(escrow);
        sbt.mint(middleman, DEAL_ID_1);
    }

    function test_Mint_EmitsTransferEvent() public {
        vm.expectEmit(true, true, true, false, address(sbt));
        emit IERC721.Transfer(address(0), middleman, 1);

        vm.prank(escrow);
        sbt.mint(middleman, DEAL_ID_1);
    }

    function testFuzz_Mint_WithAnyDealId(uint256 dealId) public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, dealId);

        assertEq(sbt.ownerOf(tokenId), middleman);
        assertEq(sbt.getDealId(tokenId), dealId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Minting — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_Mint_RevertsWhen_NotEscrow() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NFT__NotAuthorized.selector, alice));
        sbt.mint(middleman, DEAL_ID_1);
    }

    function test_Mint_RevertsWhen_AlreadyMinted() public {
        vm.startPrank(escrow);
        sbt.mint(middleman, DEAL_ID_1);

        vm.expectRevert(abi.encodeWithSelector(NFT__AlreadyMinted.selector, DEAL_ID_1, middleman));
        sbt.mint(middleman, DEAL_ID_1);
        vm.stopPrank();
    }

    function test_Mint_RevertsWhen_ZeroAddress() public {
        vm.prank(escrow);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InvalidReceiver.selector, address(0)));
        sbt.mint(address(0), DEAL_ID_1);
    }

    function testFuzz_Mint_RevertsWhen_NotEscrow(address caller) public {
        vm.assume(caller != escrow);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(NFT__NotAuthorized.selector, caller));
        sbt.mint(middleman, DEAL_ID_1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Transfer — All Vectors Blocked
    // ═══════════════════════════════════════════════════════════════

    function test_TransferFrom_Reverts() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        vm.prank(middleman);
        vm.expectRevert(NFT__TransferDisabled.selector);
        sbt.transferFrom(middleman, alice, tokenId);
    }

    function test_SafeTransferFrom_Reverts() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        vm.prank(middleman);
        vm.expectRevert(NFT__TransferDisabled.selector);
        sbt.safeTransferFrom(middleman, alice, tokenId);
    }

    function test_SafeTransferFromWithData_Reverts() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        vm.prank(middleman);
        vm.expectRevert(NFT__TransferDisabled.selector);
        sbt.safeTransferFrom(middleman, alice, tokenId, "some data");
    }

    function testFuzz_TransferFrom_AlwaysReverts(address to) public {
        vm.assume(to != address(0));

        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        vm.prank(middleman);
        vm.expectRevert(NFT__TransferDisabled.selector);
        sbt.transferFrom(middleman, to, tokenId);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Approval — Blocked
    // ═══════════════════════════════════════════════════════════════

    function test_Approve_Reverts() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        vm.prank(middleman);
        vm.expectRevert(NFT__TransferDisabled.selector);
        sbt.approve(alice, tokenId);
    }

    function test_SetApprovalForAll_Reverts() public {
        vm.prank(middleman);
        vm.expectRevert(NFT__TransferDisabled.selector);
        sbt.setApprovalForAll(alice, true);
    }

    // ═══════════════════════════════════════════════════════════════
    //  View Functions
    // ═══════════════════════════════════════════════════════════════

    function test_GetDealId_ReturnsCorrectDeal() public {
        vm.startPrank(escrow);
        uint256 tokenId1 = sbt.mint(middleman, DEAL_ID_1);
        uint256 tokenId2 = sbt.mint(alice, DEAL_ID_2);
        vm.stopPrank();

        assertEq(sbt.getDealId(tokenId1), DEAL_ID_1);
        assertEq(sbt.getDealId(tokenId2), DEAL_ID_2);
    }

    function test_GetDealId_RevertsForNonExistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        sbt.getDealId(999);
    }

    function test_GetTotalDeals_ReturnsBalance() public {
        vm.startPrank(escrow);
        sbt.mint(middleman, DEAL_ID_1);
        sbt.mint(middleman, DEAL_ID_2);
        vm.stopPrank();

        assertEq(sbt.getTotalDeals(middleman), 2);
    }

    function test_GetTotalDeals_ZeroForNewAddress() public view {
        assertEq(sbt.getTotalDeals(alice), 0);
    }

    function test_TokenURI_DoesNotRevertForMintedToken() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        // Should not revert — returns empty string by default
        sbt.tokenURI(tokenId);
    }

    function test_TokenURI_RevertsForNonExistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        sbt.tokenURI(999);
    }

    function test_Locked_ReturnsTrue() public {
        vm.prank(escrow);
        uint256 tokenId = sbt.mint(middleman, DEAL_ID_1);

        assertTrue(sbt.locked(tokenId));
    }

    function test_Locked_RevertsForNonExistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        sbt.locked(999);
    }

    function test_Name() public view {
        assertEq(sbt.name(), "Blue Escrow Soulbound");
    }

    function test_Symbol() public view {
        assertEq(sbt.symbol(), "BESBT");
    }

    // ═══════════════════════════════════════════════════════════════
    //  ERC-165 Interface Detection
    // ═══════════════════════════════════════════════════════════════

    function test_SupportsInterface_IERC721() public view {
        assertTrue(sbt.supportsInterface(type(IERC721).interfaceId));
    }

    function test_SupportsInterface_IERC165() public view {
        assertTrue(sbt.supportsInterface(type(IERC165).interfaceId));
    }

    function test_SupportsInterface_IERC5192() public view {
        assertTrue(sbt.supportsInterface(0xb45a3c0e));
    }

    function test_SupportsInterface_ISoulboundNFT() public view {
        assertTrue(sbt.supportsInterface(type(ISoulboundNFT).interfaceId));
    }

    function test_SupportsInterface_InvalidInterface() public view {
        assertFalse(sbt.supportsInterface(0xffffffff));
    }
}
