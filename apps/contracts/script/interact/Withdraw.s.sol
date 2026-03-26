// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Script, console } from "forge-std/Script.sol";
import { IEscrow } from "../../src/interfaces/IEscrow.sol";

/// @notice Withdraw pending balance for a specific token
/// @dev Uses withdrawToken() to target a single token explicitly.
///      Env: PRIVATE_KEY, ESCROW_ADDRESS, USDC_ADDRESS
contract Withdraw is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address escrow = vm.envAddress("ESCROW_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(pk);
        IEscrow(escrow).withdrawToken(usdc);
        vm.stopBroadcast();

        console.log("Withdrawn for:", vm.addr(pk));
    }
}
