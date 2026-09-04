export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en preparacion'
  | 'pedido al proveedor'
  | 'recibido'
  | 'entregado'
  | 'cancelado';

export type ShirtVersion = 'fan' | 'player';
export type SleeveType = 'short' | 'long';

export interface Settings {
  id: number;
  store_name: string;
  logo_url: string | null;
  hero_text: string;
  hero_subtext: string;
  base_price: number;
  player_extra: number;
  retro_extra: number;
  long_sleeve_extra: number;
  name_extra: number;
  number_extra: number;
  patch_extra: number;
  cost_per_shirt: number;
  created_at: string;
  updated_at: string;
}

export interface Size {
  id: string;
  label: string;
  sort_order: number;
  size_group: 'adult' | 'child';
  created_at: string;
}

export interface Patch {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  created_at: string;
  customer_name: string;
  discord: string;
  phone: string | null;
  image_url: string | null;
  size: string;
  custom_name: string | null;
  custom_number: number | null;
  patch: string | null;
  version: ShirtVersion;
  retro: boolean;
  sleeve: SleeveType;
  quantity: number;
  base_price: number;
  extras_price: number;
  total_price: number;
  status: OrderStatus;
  notes: string | null;
}

export interface OrderInput {
  customer_name: string;
  discord: string;
  phone?: string | null;
  image_url?: string | null;
  size: string;
  custom_name?: string | null;
  custom_number?: number | null;
  patch?: string | null;
  version: ShirtVersion;
  retro: boolean;
  sleeve: SleeveType;
  quantity: number;
  notes?: string | null;
}

export const ADULT_SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const CHILD_SIZE_LABELS = ['16', '18', '20', '22', '24', '26', '28'];

export const ORDER_STATUSES: OrderStatus[] = [
  'pendiente',
  'confirmado',
  'en preparacion',
  'pedido al proveedor',
  'recibido',
  'entregado',
  'cancelado',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  'pendiente': 'Pendiente',
  'confirmado': 'Confirmado',
  'en preparacion': 'En preparación',
  'pedido al proveedor': 'Pedido al proveedor',
  'recibido': 'Recibido',
  'entregado': 'Entregado',
  'cancelado': 'Cancelado',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  'pendiente': 'bg-amber-100 text-amber-800 border-amber-200',
  'confirmado': 'bg-blue-100 text-blue-800 border-blue-200',
  'en preparacion': 'bg-purple-100 text-purple-800 border-purple-200',
  'pedido al proveedor': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'recibido': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'entregado': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'cancelado': 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_DOT_COLORS: Record<OrderStatus, string> = {
  'pendiente': 'bg-amber-500',
  'confirmado': 'bg-blue-500',
  'en preparacion': 'bg-purple-500',
  'pedido al proveedor': 'bg-indigo-500',
  'recibido': 'bg-cyan-500',
  'entregado': 'bg-emerald-500',
  'cancelado': 'bg-red-500',
};
