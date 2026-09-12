import type { HitOutcome } from './types';

// Fixed colors for request outcomes: a color follows the category, it never
// shifts with which categories happen to appear on a given day. The three
// "update served" cases take blue/violet/teal, "up to date" a neutral gray,
// the refusals red/orange, and paused/expired amber.
export const HIT_OUTCOME_COLORS: Record<HitOutcome, string> = {
  uptodate: '#94a3b8',
  hdiff: '#2563eb',
  pdiff: '#7c3aed',
  full: '#0e7490',
  paused: '#ca8a04',
  expired: '#a16207',
  blocked: '#dc2626',
  unknown_package: '#ea580c',
};
