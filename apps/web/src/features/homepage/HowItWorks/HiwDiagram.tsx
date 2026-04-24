import styles from './HowItWorks.module.scss';
import {
  ActorGroup,
  CLIENT_GLYPH,
  HiwDefs,
  JudgePodium,
  MoneyPacket,
  SELLER_GLYPH,
  VaultCore,
  WireNetwork,
} from './svg';

/**
 * v7 "Live Contract View" diagram — composed from svg/ subcomponents.
 *
 * This commit is a pure structural split; the rendered SVG output is
 * byte-identical to the pre-split version, so the existing
 * howitworks-visual + hiw-a11y + hiw-responsive-type e2e baselines stay
 * green. Commits 5-6 evolve the geometry (judge podium, hex vault) on
 * top of this composition.
 */
export function HiwDiagram() {
  return (
    <svg
      className={styles.hiw__svg}
      viewBox="0 0 1200 720"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby="hiw-diag-title hiw-diag-desc"
    >
      <title id="hiw-diag-title">Three-party escrow smart contract diagram</title>
      <desc id="hiw-diag-desc">
        A central smart-contract core holds funds. Client, middleman, and
        seller are three wallets, each connected to the core by dashed wires
        that glow when a phase activates them. A money packet flows from the
        client to the core when the deal is locked, then from the core to the
        seller when funds are released.
      </desc>

      <HiwDefs />
      <WireNetwork />
      <VaultCore />

      <ActorGroup
        kind="client"
        x={180}
        y={420}
        role="CLIENT"
        name="Sofia R."
        meta="0x7a2f…e91c"
        glyph={CLIENT_GLYPH}
      />
      <JudgePodium />
      <ActorGroup
        kind="seller"
        x={1020}
        y={420}
        role="SELLER"
        name="Diego M."
        meta="0xd20e…77ab"
        glyph={SELLER_GLYPH}
      />

      <MoneyPacket />
    </svg>
  );
}
