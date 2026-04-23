import { parseColor } from './color';

const EXP_DARK_FG = 0.622;
const EXP_LIGHT_FG = 0.622;
const EXP_DARK_BG = 0.65;
const EXP_LIGHT_BG = 0.65;
const REV_BOW = 1.25;
const NORM_BOW = 1.414;
const BLACK_THRESH = 0.022;
const BLACK_CLAMP_POW = 1.414;
const SCALE_BOW = 1.14;
const LO_BOW_THRESH = 0.001;
const LO_BOW_FACTOR = 27.7847239587675;
const DELTA_Y_MIN = 0.0005;
const MAIN_TRC = 2.4;
const S_A_POW = 0.0 - 2.4;
const COEF_R = 0.2126729;
const COEF_G = 0.7151522;
const COEF_B = 0.072175;

function sRgbToY([r, g, b]: readonly [number, number, number]): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  return (
    COEF_R * Math.pow(rn, MAIN_TRC) +
    COEF_G * Math.pow(gn, MAIN_TRC) +
    COEF_B * Math.pow(bn, MAIN_TRC)
  );
}

function clampBlack(y: number): number {
  return y < BLACK_THRESH
    ? y + Math.pow(BLACK_THRESH - y, BLACK_CLAMP_POW)
    : y;
}

export function apcaContrast(foreground: string, background: string): number {
  const yFg = clampBlack(sRgbToY(parseColor(foreground)));
  const yBg = clampBlack(sRgbToY(parseColor(background)));

  if (Math.abs(yFg - yBg) < DELTA_Y_MIN) return 0;

  let output: number;
  if (yBg > yFg) {
    const sapc = (Math.pow(yBg, EXP_DARK_BG) - Math.pow(yFg, EXP_DARK_FG)) * SCALE_BOW;
    output = sapc < LO_BOW_THRESH ? 0 : (sapc - 0.027) * 100;
  } else {
    const sapc = (Math.pow(yBg, EXP_LIGHT_BG) - Math.pow(yFg, EXP_LIGHT_FG)) * REV_BOW;
    output = sapc > -LO_BOW_THRESH ? 0 : (sapc + 0.027) * 100;
  }

  return output;
}

export function apcaLc(foreground: string, background: string): number {
  return Math.abs(apcaContrast(foreground, background));
}
