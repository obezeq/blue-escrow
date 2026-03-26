export const addresses = {
  421614: {
    escrow: '0x31513B2ab788ba2528a1566Dd51B1d894D97c303' as const,
    middlemanRegistry: '0x985568E5A5A7d1231B54d3BA429E6Fe5cCbC329F' as const,
    soulboundNFT: '0x1e22966A56Cb55977F4657FF254e0658381CA0ce' as const,
    receiptNFT: '0x184b76e9513be07022B88170aC71A8f0F32965b7' as const,
    usdc: '0xA10930464a262ce1fCc84eEC601004d863784C36' as const,
  },
} as const;

export type ChainId = keyof typeof addresses;
export type ContractAddresses = (typeof addresses)[ChainId];
