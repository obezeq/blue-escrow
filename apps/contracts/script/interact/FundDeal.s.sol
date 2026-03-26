// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Script, console } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IEscrow } from "../../src/interfaces/IEscrow.sol";
import { Deal } from "../../src/types/DataTypes.sol";

/// @notice Approve USDC and fund a deal (client only)
/// @dev Reads the deal amount on-chain to avoid env var mismatches.
///      Env: PRIVATE_KEY, ESCROW_ADDRESS, USDC_ADDRESS, DEAL_ID
contract FundDeal is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address escrow = vm.envAddress("ESCROW_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint256 dealId = vm.envUint("DEAL_ID");

        Deal memory deal = IEscrow(escrow).getDeal(dealId);

        vm.startBroadcast(pk);
        IERC20(usdc).approve(escrow, deal.amount);
        IEscrow(escrow).fundDeal(dealId);
        vm.stopBroadcast();

        console.log("Deal funded. ID:", dealId);
        console.log("Amount:", uint256(deal.amount));
    }
}
