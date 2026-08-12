import type { ElementType, EnemyRank, PathType } from '../types/hsr';

/** Element accent colours, matching the `--color-el-*` tokens in index.css. */
export const ELEMENT_COLOR: Record<ElementType, string> = {
  Physical: 'var(--color-el-physical)',
  Fire: 'var(--color-el-fire)',
  Ice: 'var(--color-el-ice)',
  Lightning: 'var(--color-el-lightning)',
  Wind: 'var(--color-el-wind)',
  Quantum: 'var(--color-el-quantum)',
  Imaginary: 'var(--color-el-imaginary)'
};

export const PATH_ABBREVIATION: Record<PathType, string> = {
  Destruction: 'DES',
  'The Hunt': 'HNT',
  Erudition: 'ERU',
  Harmony: 'HAR',
  Nihility: 'NIH',
  Preservation: 'PRE',
  Abundance: 'ABU',
  Remembrance: 'REM',
  Elation: 'ELA'
};

export const RANK_LABEL: Record<EnemyRank, string> = {
  Minion: 'Minion',
  MinionLv2: 'Minion',
  Elite: 'Elite',
  LittleBoss: 'Boss',
  Boss: 'Boss'
};

/** 3,177,336 -> "3.18M" so wide tables stay readable. */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

export function fullNumber(value: number): string {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '—';
}

export function percent(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)}%`;
}

/** Toughness reads more naturally as bars: 240 toughness = 8 bars of 30. */
export function toughnessBars(toughness: number): number {
  return Math.round((toughness / 30) * 10) / 10;
}
