// Post-`prisma generate` fixup.
//
// `prisma-json-types-generator@4` emits `pjtg.ts` with a relative import
// missing the `.js` extension that NodeNext requires. The other generated
// files in the same tree (client.ts, models/*.ts) carry `// @ts-nocheck`
// to escape this kind of issue, but pjtg.ts does not. Rather than monkey
// with the imports themselves (which the generator overwrites on every
// run), we just add the same `// @ts-nocheck` directive — the file is
// machine-generated and not meant to be hand-checked anyway.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const target = path.resolve('src/generated/prisma/pjtg.ts');

if (!existsSync(target)) {
  process.stderr.write(`post-prisma-generate: ${target} not found — skipping\n`);
  process.exit(0);
}

const content = readFileSync(target, 'utf8');
if (content.startsWith('// @ts-nocheck')) {
  process.stdout.write('post-prisma-generate: pjtg.ts already patched\n');
  process.exit(0);
}

writeFileSync(target, `// @ts-nocheck\n${content}`);
process.stdout.write('post-prisma-generate: patched pjtg.ts\n');
