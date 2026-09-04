import type { Settings, ShirtVersion, SleeveType } from './types';

export interface PriceBreakdown {
  base: number;
  playerExtra: number;
  retroExtra: number;
  longSleeveExtra: number;
  nameExtra: number;
  numberExtra: number;
  patchExtra: number;
  extrasTotal: number;
  unitTotal: number;
  quantity: number;
  grandTotal: number;
}

export function calculatePrice(
  settings: Settings,
  version: ShirtVersion,
  retro: boolean,
  sleeve: SleeveType,
  hasCustomName: boolean,
  hasCustomNumber: boolean,
  hasPatch: boolean,
  quantity: number
): PriceBreakdown {
  const base = settings.base_price;
  const playerExtra = version === 'player' ? settings.player_extra : 0;
  const retroExtra = retro ? settings.retro_extra : 0;
  const longSleeveExtra = sleeve === 'long' ? settings.long_sleeve_extra : 0;
  const nameExtra = hasCustomName ? settings.name_extra : 0;
  const numberExtra = hasCustomNumber ? settings.number_extra : 0;
  const patchExtra = hasPatch ? settings.patch_extra : 0;

  const extrasTotal =
    playerExtra +
    retroExtra +
    longSleeveExtra +
    nameExtra +
    numberExtra +
    patchExtra;

  const unitTotal = base + extrasTotal;
  const grandTotal = unitTotal * quantity;

  return {
    base,
    playerExtra,
    retroExtra,
    longSleeveExtra,
    nameExtra,
    numberExtra,
    patchExtra,
    extrasTotal,
    unitTotal,
    quantity,
    grandTotal,
  };
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}
