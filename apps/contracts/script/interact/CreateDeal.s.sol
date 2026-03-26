// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Script, console } from "forge-std/Script.sol";
import { IEscrow } from "../../src/interfaces/IEscrow.sol";

/// @notice Create a new escrow deal
/// @dev Env: PRIVATE_KEY, ESCROW_ADDRESS, CLIENT, SELLER, MIDDLEMAN, USDC_ADDRESS, DEAL_AMOUNT
contract CreateDeal is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address escrow = vm.envAddress("ESCROW_ADDRESS");
        address client = vm.envAddress("CLIENT");
        address seller = vm.envAddress("SELLER");
        address middleman = vm.envAddress("MIDDLEMAN");
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint96 amount = uint96(vm.envUint("DEAL_AMOUNT"));
        uint48 timeoutDuration = uint48(vm.envOr("TIMEOUT_DURATION", uint256(0)));

        vm.startBroadcast(pk);
        uint256 dealId = IEscrow(escrow).createDeal(client, seller, middleman, usdc, amount, timeoutDuration);
        vm.stopBroadcast();

        console.log("Deal created. ID:", dealId);
    }
}
