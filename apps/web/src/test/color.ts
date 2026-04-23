export type Rgb = readonly [number, number, number];

export function parseColor(css: string): Rgb {
  const trimmed = css.trim();
  if (!trimmed || trimmed === 'transparent' || trimmed === 'initial') {
    throw new Error(`Cannot parse color: "${css}"`);
  }
  const hex = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }
  const hex3 = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const s = hex3[1]!;
    return [
      parseInt(s[0]! + s[0]!, 16),
      parseInt(s[1]! + s[1]!, 16),
      parseInt(s[2]! + s[2]!, 16),
    ];
  }
  const rgb = trimmed.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) {
    return [parseInt(rgb[1]!, 10), parseInt(rgb[2]!, 10), parseInt(rgb[3]!, 10)];
  }
  throw new Error(`Cannot parse color: "${css}"`);
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const srgb = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

export function contrastRatio(rgb1: Rgb, rgb2: Rgb): number {
  const L1 = relativeLuminance(rgb1);
  const L2 = relativeLuminance(rgb2);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

export function mixOklch(color: string, mixWith: string, percent: number): string {
  const [r1, g1, b1] = parseColor(color);
  const [r2, g2, b2] = parseColor(mixWith);
  const t = percent / 100;
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const g = Math.round(g1 * (1 - t) + g2 * t);
  const b = Math.round(b1 * (1 - t) + b2 * t);
  return `rgb(${r}, ${g}, ${b})`;
}
