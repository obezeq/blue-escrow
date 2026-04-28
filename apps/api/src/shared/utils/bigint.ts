// Side-effect import. JSON.stringify cannot handle BigInt natively (throws
// TypeError: "Do not know how to serialize a BigInt"). Prisma returns BigInt
// for `BigInt` columns (block numbers, deal IDs), so without this polyfill
// any response that touches those fields would crash express. Stringify to
// preserve the full uint256 value — JS Number cannot.
//
// Imported once at the top of app.ts; the assignment is idempotent.

(BigInt.prototype as unknown as { toJSON(): string }).toJSON = function (this: bigint) {
  return this.toString();
};
