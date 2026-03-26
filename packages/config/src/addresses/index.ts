export const addresses = {
  421614: {
    escrow: '0x1E00E9a3163D406affFE93970851c18883f0a04a' as const,
    middlemanRegistry: '0x14E2208039bF5F6bF6e455A3985e57B86B12AE26' as const,
    soulboundNFT: '0x156d872a812118be39561551462D1433daB31930' as const,
    receiptNFT: '0xcBAA856799De081cBf105F20453539F778de7FCF' as const,
    usdc: '0x24F43943893815be52ad9189a470915c5C72b6D0' as const,
  },
} as const;

export type ChainId = keyof typeof addresses;
export type ContractAddresses = (typeof addresses)[ChainId];
