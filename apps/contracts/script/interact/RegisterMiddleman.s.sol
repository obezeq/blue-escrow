// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Script, console } from "forge-std/Script.sol";
import { IMiddlemanRegistry } from "../../src/interfaces/IMiddlemanRegistry.sol";

/// @notice Register msg.sender as a middleman with the given commission rate
/// @dev Env: PRIVATE_KEY, REGISTRY_ADDRESS, COMMISSION_BPS
contract RegisterMiddleman is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address registry = vm.envAddress("REGISTRY_ADDRESS");
        uint16 commissionBps = uint16(vm.envUint("COMMISSION_BPS"));

        vm.startBroadcast(pk);
        IMiddlemanRegistry(registry).register(commissionBps);
        vm.stopBroadcast();

        console.log("Registered middleman:", vm.addr(pk));
        console.log("Commission (bps):", uint256(commissionBps));
    }
}
