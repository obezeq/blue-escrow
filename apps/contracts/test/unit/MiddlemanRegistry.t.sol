// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Test } from "forge-std/Test.sol";
import { MiddlemanRegistry } from "../../src/registry/MiddlemanRegistry.sol";
import { IMiddlemanRegistry } from "../../src/interfaces/IMiddlemanRegistry.sol";
import {
    Registry__AlreadyRegistered,
    Registry__NotRegistered,
    Registry__InvalidCommission
} from "../../src/utils/Errors.sol";
import {
    MiddlemanRegistered,
    MiddlemanUnregistered,
    CommissionUpdated
} from "../../src/utils/Events.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title MiddlemanRegistryTest
/// @notice Unit + fuzz tests for the MiddlemanRegistry contract (TDD — RED phase)
contract MiddlemanRegistryTest is Test {
    MiddlemanRegistry internal registry;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint16 internal constant MAX_COMMISSION = 5000;
    uint16 internal constant VALID_COMMISSION = 2500;

    function setUp() public {
        registry = new MiddlemanRegistry(address(this));
    }

    // ═══════════════════════════════════════════════════════════════
    //  Registration — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_Register_WithValidCommission() public {
        vm.prank(alice);
        registry.register(VALID_COMMISSION);

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.getCommission(alice), VALID_COMMISSION);
        assertEq(registry.getMiddlemanCount(), 1);
    }

    function test_Register_WithZeroCommission() public {
        vm.prank(alice);
        registry.register(0);

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.getCommission(alice), 0);
    }

    function test_Register_AtMaxCommission() public {
        vm.prank(alice);
        registry.register(MAX_COMMISSION);

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.getCommission(alice), MAX_COMMISSION);
    }

    function test_Register_EmitsEvent() public {
        vm.expectEmit(true, false, false, true, address(registry));
        emit MiddlemanRegistered(alice, VALID_COMMISSION);

        vm.prank(alice);
        registry.register(VALID_COMMISSION);
    }

    function test_Register_MultipleMiddlemen() public {
        vm.prank(alice);
        registry.register(1000);

        vm.prank(bob);
        registry.register(2000);

        assertTrue(registry.isRegistered(alice));
        assertTrue(registry.isRegistered(bob));
        assertEq(registry.getCommission(alice), 1000);
        assertEq(registry.getCommission(bob), 2000);
        assertEq(registry.getMiddlemanCount(), 2);
    }

    function testFuzz_Register(uint16 commission) public {
        commission = uint16(bound(commission, 0, MAX_COMMISSION));

        vm.prank(alice);
        registry.register(commission);

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.getCommission(alice), commission);
        assertEq(registry.getMiddlemanCount(), 1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Registration — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_Register_RevertsWhen_AlreadyRegistered() public {
        vm.startPrank(alice);
        registry.register(VALID_COMMISSION);

        vm.expectRevert(abi.encodeWithSelector(Registry__AlreadyRegistered.selector, alice));
        registry.register(VALID_COMMISSION);
        vm.stopPrank();
    }

    function test_Register_RevertsWhen_CommissionExceedsMax() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Registry__InvalidCommission.selector, uint16(5001)));
        registry.register(5001);
    }

    function test_Register_RevertsWhen_CommissionIsMaxUint16() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(Registry__InvalidCommission.selector, type(uint16).max)
        );
        registry.register(type(uint16).max);
    }

    function testFuzz_Register_RevertsWhen_CommissionExceedsMax(uint16 commission) public {
        commission = uint16(bound(commission, MAX_COMMISSION + 1, type(uint16).max));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Registry__InvalidCommission.selector, commission));
        registry.register(commission);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Unregistration — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_Unregister() public {
        vm.startPrank(alice);
        registry.register(VALID_COMMISSION);
        registry.unregister();
        vm.stopPrank();

        assertFalse(registry.isRegistered(alice));
        assertEq(registry.getMiddlemanCount(), 0);
    }

    function test_Unregister_EmitsEvent() public {
        vm.prank(alice);
        registry.register(VALID_COMMISSION);

        vm.expectEmit(true, false, false, false, address(registry));
        emit MiddlemanUnregistered(alice);

        vm.prank(alice);
        registry.unregister();
    }

    function test_Unregister_DecrementsCount() public {
        vm.prank(alice);
        registry.register(1000);

        vm.prank(bob);
        registry.register(2000);

        assertEq(registry.getMiddlemanCount(), 2);

        vm.prank(alice);
        registry.unregister();

        assertEq(registry.getMiddlemanCount(), 1);
        assertFalse(registry.isRegistered(alice));
        assertTrue(registry.isRegistered(bob));
    }

    function test_Unregister_ClearsCommission() public {
        vm.startPrank(alice);
        registry.register(VALID_COMMISSION);
        registry.unregister();
        vm.stopPrank();

        vm.expectRevert(abi.encodeWithSelector(Registry__NotRegistered.selector, alice));
        registry.getCommission(alice);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Unregistration — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_Unregister_RevertsWhen_NotRegistered() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Registry__NotRegistered.selector, alice));
        registry.unregister();
    }

    function test_Unregister_RevertsWhen_CalledTwice() public {
        vm.startPrank(alice);
        registry.register(VALID_COMMISSION);
        registry.unregister();

        vm.expectRevert(abi.encodeWithSelector(Registry__NotRegistered.selector, alice));
        registry.unregister();
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Re-registration After Unregister
    // ═══════════════════════════════════════════════════════════════

    function test_ReRegister_AfterUnregister() public {
        vm.startPrank(alice);
        registry.register(1000);
        registry.unregister();
        registry.register(2000);
        vm.stopPrank();

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.getCommission(alice), 2000);
        assertEq(registry.getMiddlemanCount(), 1);
    }

    function test_ReRegister_CountCorrectness() public {
        vm.startPrank(alice);

        registry.register(1000);
        assertEq(registry.getMiddlemanCount(), 1);

        registry.unregister();
        assertEq(registry.getMiddlemanCount(), 0);

        registry.register(2000);
        assertEq(registry.getMiddlemanCount(), 1);

        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    //  setCommission — Happy Path
    // ═══════════════════════════════════════════════════════════════

    function test_SetCommission() public {
        vm.startPrank(alice);
        registry.register(1000);
        registry.setCommission(VALID_COMMISSION);
        vm.stopPrank();

        assertEq(registry.getCommission(alice), VALID_COMMISSION);
    }

    function test_SetCommission_ToZero() public {
        vm.startPrank(alice);
        registry.register(VALID_COMMISSION);
        registry.setCommission(0);
        vm.stopPrank();

        assertEq(registry.getCommission(alice), 0);
    }

    function test_SetCommission_ToMax() public {
        vm.startPrank(alice);
        registry.register(1000);
        registry.setCommission(MAX_COMMISSION);
        vm.stopPrank();

        assertEq(registry.getCommission(alice), MAX_COMMISSION);
    }

    function test_SetCommission_ToSameValue() public {
        vm.startPrank(alice);
        registry.register(VALID_COMMISSION);

        // Same value — no revert, event still emits
        vm.expectEmit(true, false, false, true, address(registry));
        emit CommissionUpdated(alice, VALID_COMMISSION, VALID_COMMISSION);

        registry.setCommission(VALID_COMMISSION);
        vm.stopPrank();
    }

    function test_SetCommission_EmitsEvent() public {
        vm.prank(alice);
        registry.register(1000);

        vm.expectEmit(true, false, false, true, address(registry));
        emit CommissionUpdated(alice, 1000, VALID_COMMISSION);

        vm.prank(alice);
        registry.setCommission(VALID_COMMISSION);
    }

    function testFuzz_SetCommission(uint16 newCommission) public {
        newCommission = uint16(bound(newCommission, 0, MAX_COMMISSION));

        vm.startPrank(alice);
        registry.register(1000);
        registry.setCommission(newCommission);
        vm.stopPrank();

        assertEq(registry.getCommission(alice), newCommission);
    }

    // ═══════════════════════════════════════════════════════════════
    //  setCommission — Revert Paths
    // ═══════════════════════════════════════════════════════════════

    function test_SetCommission_RevertsWhen_NotRegistered() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Registry__NotRegistered.selector, alice));
        registry.setCommission(1000);
    }

    function test_SetCommission_RevertsWhen_CommissionExceedsMax() public {
        vm.startPrank(alice);
        registry.register(1000);

        vm.expectRevert(abi.encodeWithSelector(Registry__InvalidCommission.selector, uint16(5001)));
        registry.setCommission(5001);
        vm.stopPrank();
    }

    function testFuzz_SetCommission_RevertsWhen_CommissionExceedsMax(uint16 newCommission) public {
        newCommission = uint16(bound(newCommission, MAX_COMMISSION + 1, type(uint16).max));

        vm.startPrank(alice);
        registry.register(1000);

        vm.expectRevert(
            abi.encodeWithSelector(Registry__InvalidCommission.selector, newCommission)
        );
        registry.setCommission(newCommission);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    //  View Functions
    // ═══════════════════════════════════════════════════════════════

    function test_IsRegistered_ReturnsFalse_ForUnregisteredAddress() public view {
        assertFalse(registry.isRegistered(alice));
    }

    function test_GetMiddlemanCount_StartsAtZero() public view {
        assertEq(registry.getMiddlemanCount(), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  ERC-165 Interface Detection
    // ═══════════════════════════════════════════════════════════════

    function test_SupportsInterface_IMiddlemanRegistry() public view {
        assertTrue(registry.supportsInterface(type(IMiddlemanRegistry).interfaceId));
    }

    function test_SupportsInterface_IERC165() public view {
        assertTrue(registry.supportsInterface(type(IERC165).interfaceId));
    }

    function test_SupportsInterface_InvalidInterface() public view {
        assertFalse(registry.supportsInterface(0xffffffff));
    }

    function test_SupportsInterface_RandomBytes() public view {
        assertFalse(registry.supportsInterface(0xdeadbeef));
    }
}
