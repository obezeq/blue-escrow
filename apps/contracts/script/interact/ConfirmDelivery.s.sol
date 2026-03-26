// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Script, console } from "forge-std/Script.sol";
import { IEscrow } from "../../src/interfaces/IEscrow.sol";

/// @notice Client confirms delivery — resolves the deal in favor of the seller
/// @dev Env: PRIVATE_KEY, ESCROW_ADDRESS, DEAL_ID
contract ConfirmDelivery is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address escrow = vm.envAddress("ESCROW_ADDRESS");
        uint256 dealId = vm.envUint("DEAL_ID");

        vm.startBroadcast(pk);
        IEscrow(escrow).confirmDelivery(dealId);
        vm.stopBroadcast();

        console.log("Delivery confirmed. Deal ID:", dealId);
    }
}
