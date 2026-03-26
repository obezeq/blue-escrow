// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Script, console } from "forge-std/Script.sol";
import { MockUSDC } from "../../test/mocks/MockUSDC.sol";
import { MiddlemanRegistry } from "../../src/registry/MiddlemanRegistry.sol";
import { SoulboundNFT } from "../../src/tokens/SoulboundNFT.sol";
import { ReceiptNFT } from "../../src/tokens/ReceiptNFT.sol";
import { Escrow } from "../../src/core/Escrow.sol";
import { DealConfig } from "../../src/types/DataTypes.sol";

/// @title Deploy
/// @notice Deploys the full Blue Escrow contract suite
/// @dev Handles the circular dependency between Escrow <-> NFTs via address prediction.
///
///      Env vars:
///        DEPLOYER_PRIVATE_KEY  — Deployer private key (Anvil only; use --account for prod)
///        FEE_RECIPIENT         — Platform fee recipient (defaults to deployer)
///        PLATFORM_FEE_BPS      — Platform fee in bps (defaults to 33 = 0.33%)
///        DEFAULT_TIMEOUT       — Deal timeout in seconds (defaults to 2851200 = 33 days)
///        USDC_ADDRESS          — USDC address (required on non-local chains)
///
///      Usage:
///        Local:   forge script script/deploy/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
///        Testnet: forge script script/deploy/Deploy.s.sol --rpc-url arbitrum_sepolia --account blue-escrow-dev --sender $SENDER --broadcast --verify
contract Deploy is Script {
    function run() external {
        bool isLocal = block.chainid == 31337;

        address deployer;
        if (isLocal) {
            uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
            deployer = vm.addr(deployerKey);
        } else {
            deployer = msg.sender;
        }

        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        uint16 platformFeeBps = uint16(vm.envOr("PLATFORM_FEE_BPS", uint256(33)));
        uint48 defaultTimeout = uint48(vm.envOr("DEFAULT_TIMEOUT", uint256(2_851_200)));

        // ── Nonce prediction (BEFORE broadcast) ─────────────────
        uint64 nonce = vm.getNonce(deployer);
        //
        // Local:     MockUSDC(n+0)  Registry(n+1)  Soulbound(n+2)  Receipt(n+3)  Escrow(n+4)
        // Non-local:                Registry(n+0)  Soulbound(n+1)  Receipt(n+2)  Escrow(n+3)
        uint64 escrowOffset = isLocal ? 4 : 3;
        address predictedEscrow = vm.computeCreateAddress(deployer, nonce + escrowOffset);

        // ── Deploy ──────────────────────────────────────────────
        if (isLocal) {
            vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        } else {
            vm.startBroadcast();
        }

        // 1. USDC
        address usdc;
        if (isLocal) {
            MockUSDC mockUsdc = new MockUSDC();
            usdc = address(mockUsdc);
            console.log("MockUSDC:", usdc);
        } else {
            usdc = vm.envAddress("USDC_ADDRESS");
            require(usdc != address(0), "Deploy: USDC_ADDRESS required on non-local chains");
            console.log("USDC (existing):", usdc);
        }

        // 2. MiddlemanRegistry
        MiddlemanRegistry registry = new MiddlemanRegistry(deployer);
        console.log("MiddlemanRegistry:", address(registry));

        // 3. NFTs (with predicted Escrow address)
        SoulboundNFT soulbound = new SoulboundNFT(predictedEscrow);
        console.log("SoulboundNFT:", address(soulbound));

        ReceiptNFT receipt = new ReceiptNFT(predictedEscrow);
        console.log("ReceiptNFT:", address(receipt));

        // 4. Escrow
        DealConfig memory config = DealConfig({
            feeRecipient: feeRecipient,
            defaultTimeout: defaultTimeout,
            platformFeeBps: platformFeeBps
        });
        Escrow escrow = new Escrow(deployer, config, address(registry), address(soulbound), address(receipt));

        require(address(escrow) == predictedEscrow, "Deploy: Escrow address prediction failed");
        console.log("Escrow:", address(escrow));

        // 5. Post-deployment: whitelist USDC
        escrow.addAllowedToken(usdc);

        vm.stopBroadcast();

        // ── Summary ─────────────────────────────────────────────
        console.log("---");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("FeeRecipient:", feeRecipient);
        console.log("PlatformFeeBps:", uint256(platformFeeBps));
        console.log("DefaultTimeout:", uint256(defaultTimeout));
    }
}
