// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Test } from "forge-std/Test.sol";
import { ReceiptNFT } from "../../src/tokens/ReceiptNFT.sol";
import { IReceiptNFT } from "../../src/interfaces/IReceiptNFT.sol";
import { NFT__NotAuthorized, NFT__AlreadyMinted } from "../../src/utils/Errors.sol";
import { ReceiptNFTMinted } from "../../src/utils/Events.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/// @title ReceiptNFTTest
/// @notice Unit + fuzz tests for the ReceiptNFT contract (TDD — RED phase)
contract ReceiptNFTTest is Test {
    ReceiptNFT internal receipt;

    address internal escrow = makeAddr("escrow");
    address internal client = makeAddr("client");
    address internal seller = makeAddr("seller");
    address internal alice = makeAddr("alice");

    uint256 internal constant DEAL_ID_1 = 1;
    uint256 internal constant DEAL_ID_2 = 2;

    function setUp() public {
        receipt = new ReceiptNFT(escrow);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Minting — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_Mint_ByEscrow() public {
        vm.prank(escrow);
        uint256 tokenId = receipt.mint(client, DEAL_ID_1);

        assertEq(receipt.ownerOf(tokenId), client);
        assertEq(tokenId, 1);
    }

    function test_Mint_IncrementsBalance() public {
        vm.startPrank(escrow);
        receipt.mint(client, DEAL_ID_1);
        receipt.mint(client, DEAL_ID_2);
        vm.stopPrank();

        assertEq(receipt.balanceOf(client), 2);
    }

    function test_Mint_AutoIncrementsTokenId() public {
        vm.startPrank(escrow);
        uint256 id1 = receipt.mint(client, DEAL_ID_1);
        uint256 id2 = receipt.mint(seller, DEAL_ID_2);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_Mint_StoresDealId() public {
        vm.prank(escrow);
        uint256 tokenId = receipt.mint(client, DEAL_ID_1);

        assertEq(receipt.getDealId(tokenId), DEAL_ID_1);
    }

    function test_Mint_EmitsReceiptNFTMinted() public {
        vm.expectEmit(true, true, true, true, address(receipt));
        emit ReceiptNFTMinted(1, client, DEAL_ID_1);

        vm.prank(escrow);
        receipt.mint(client, DEAL_ID_1);
    }

    function test_Mint_EmitsTransferEvent() public {
        vm.expectEmit(true, true, true, false, address(receipt));
        emit IERC721.Transfer(address(0), client, 1);

        vm.prank(escrow);
        receipt.mint(client, DEAL_ID_1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Minting — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_Mint_RevertsWhen_NotEscrow() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NFT__NotAuthorized.selector, alice));
        receipt.mint(client, DEAL_ID_1);
    }

    function test_Mint_RevertsWhen_AlreadyMinted() public {
        vm.startPrank(escrow);
        receipt.mint(client, DEAL_ID_1);

        vm.expectRevert(abi.encodeWithSelector(NFT__AlreadyMinted.selector, DEAL_ID_1, client));
        receipt.mint(client, DEAL_ID_1);
        vm.stopPrank();
    }

    function test_Mint_RevertsWhen_ZeroAddress() public {
        vm.prank(escrow);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InvalidReceiver.selector, address(0)));
        receipt.mint(address(0), DEAL_ID_1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Fuzz
    // ═══════════════════════════════════════════════════════════════

    function testFuzz_Mint_WithAnyDealId(uint256 dealId) public {
        vm.prank(escrow);
        uint256 tokenId = receipt.mint(client, dealId);

        assertEq(receipt.ownerOf(tokenId), client);
        assertEq(receipt.getDealId(tokenId), dealId);
    }

    function testFuzz_Mint_RevertsWhen_NotEscrow(address caller) public {
        vm.assume(caller != escrow);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(NFT__NotAuthorized.selector, caller));
        receipt.mint(client, DEAL_ID_1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Transfer — Works (unlike Soulbound)
    // ═══════════════════════════════════════════════════════════════

    function test_TransferFrom_Works() public {
        vm.prank(escrow);
        uint256 tokenId = receipt.mint(client, DEAL_ID_1);

        vm.prank(client);
        receipt.transferFrom(client, alice, tokenId);

        assertEq(receipt.ownerOf(tokenId), alice);
    }

    function test_SafeTransferFrom_Works() public {
        vm.prank(escrow);
        uint256 tokenId = receipt.mint(client, DEAL_ID_1);

        vm.prank(client);
        receipt.safeTransferFrom(client, alice, tokenId);

        assertEq(receipt.ownerOf(tokenId), alice);
    }

    // ═══════════════════════════════════════════════════════════════
    //  View Functions
    // ═══════════════════════════════════════════════════════════════

    function test_GetDealId_ReturnsCorrectDeal() public {
        vm.startPrank(escrow);
        uint256 tokenId1 = receipt.mint(client, DEAL_ID_1);
        uint256 tokenId2 = receipt.mint(seller, DEAL_ID_2);
        vm.stopPrank();

        assertEq(receipt.getDealId(tokenId1), DEAL_ID_1);
        assertEq(receipt.getDealId(tokenId2), DEAL_ID_2);
    }

    function test_GetDealId_RevertsForNonExistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        receipt.getDealId(999);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Multiple Mints Per Deal
    // ═══════════════════════════════════════════════════════════════

    function test_MintMultipleForSameDeal() public {
        vm.startPrank(escrow);
        uint256 clientTokenId = receipt.mint(client, DEAL_ID_1);
        uint256 sellerTokenId = receipt.mint(seller, DEAL_ID_1);
        vm.stopPrank();

        assertEq(receipt.ownerOf(clientTokenId), client);
        assertEq(receipt.ownerOf(sellerTokenId), seller);
        assertEq(clientTokenId, 1);
        assertEq(sellerTokenId, 2);
        assertEq(receipt.getDealId(clientTokenId), DEAL_ID_1);
        assertEq(receipt.getDealId(sellerTokenId), DEAL_ID_1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Token Metadata
    // ═══════════════════════════════════════════════════════════════

    function test_Name() public view {
        assertEq(receipt.name(), "Blue Escrow Receipt");
    }

    function test_Symbol() public view {
        assertEq(receipt.symbol(), "BERCT");
    }

    function test_TokenURI_DoesNotRevertForMintedToken() public {
        vm.prank(escrow);
        uint256 tokenId = receipt.mint(client, DEAL_ID_1);

        // Should not revert — returns empty string by default
        receipt.tokenURI(tokenId);
    }

    function test_TokenURI_RevertsForNonExistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        receipt.tokenURI(999);
    }

    // ═══════════════════════════════════════════════════════════════
    //  ERC-165 Interface Detection
    // ═══════════════════════════════════════════════════════════════

    function test_SupportsInterface_IERC721() public view {
        assertTrue(receipt.supportsInterface(type(IERC721).interfaceId));
    }

    function test_SupportsInterface_IERC165() public view {
        assertTrue(receipt.supportsInterface(type(IERC165).interfaceId));
    }

    function test_SupportsInterface_IReceiptNFT() public view {
        assertTrue(receipt.supportsInterface(type(IReceiptNFT).interfaceId));
    }

    function test_SupportsInterface_InvalidInterface() public view {
        assertFalse(receipt.supportsInterface(0xffffffff));
    }
}
