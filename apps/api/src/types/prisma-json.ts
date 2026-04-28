// Global augmentation consumed by prisma-json-types-generator. Each `///
// [TypeName]` doc-comment in schema.prisma resolves to a member of the
// PrismaJson namespace declared here, giving Json columns precise types
// in the generated client.
//
// `export {}` makes this a module so `declare global` is well-formed.

export {};

// `namespace` is required here for declaration-merging with the
// generator-emitted `PrismaJson` namespace in src/generated/prisma/pjtg.ts.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    // DealMetadata.participantsJson — the three role-keyed addresses for a
    // deal. Stored lowercased to match addressLower elsewhere.
    type DealParticipants = {
      client: string;
      seller: string;
      middleman?: string;
    };

    // NftMetadataCache.attributesJson — OpenSea/EIP-721 attribute array.
    type NftAttributes = Array<{
      trait_type: string;
      value: string | number;
    }>;

    // IndexedEvent.argsJson — event-specific decoded args. Refined to a
    // discriminated union per `eventName` in the indexer (S07); kept loose
    // here so the schema doesn't have to know about every event up front.
    type IndexedEventArgs = Record<string, unknown>;

    // IndexerError.contextJson — diagnostic blob (RPC response, decode
    // attempt, retry counter…). Free-form by design.
    type IndexerErrorContext = Record<string, unknown>;
  }
}
