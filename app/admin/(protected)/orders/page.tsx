'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/pricing';
import type { Order, OrderStatus, Size } from '@/lib/types';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS } from '@/lib/types';
import { Search, Loader2, Eye, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [retroFilter, setRetroFilter] = useState<string>('all');
  const [sleeveFilter, setSleeveFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const [ordersRes, sizesRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('sizes').select('*').order('sort_order'),
      ]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (sizesRes.data) setSizes(sizesRes.data as Size[]);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          o.customer_name.toLowerCase().includes(q) ||
          o.discord.toLowerCase().includes(q) ||
          (o.phone?.toLowerCase().includes(q) ?? false) ||
          String(o.order_number).includes(q);
        if (!matches) return false;
      }
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (sizeFilter !== 'all' && o.size !== sizeFilter) return false;
      if (versionFilter !== 'all' && o.version !== versionFilter) return false;
      if (retroFilter !== 'all') {
        const isRetro = retroFilter === 'yes';
        if (o.retro !== isRetro) return false;
      }
      if (sleeveFilter !== 'all' && o.sleeve !== sleeveFilter) return false;
      return true;
    });
  }, [orders, search, statusFilter, sizeFilter, versionFilter, retroFilter, sleeveFilter]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const pagedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, sizeFilter, versionFilter, retroFilter, sleeveFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
        <p className="text-sm text-slate-500">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por número, nombre, discord o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter selects */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Talla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tallas</SelectItem>
                  {sizes.map((s) => (
                    <SelectItem key={s.id} value={s.label}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={versionFilter} onValueChange={setVersionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Versión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las versiones</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>

              <Select value={retroFilter} onValueChange={setRetroFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Retro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Retro: Todos</SelectItem>
                  <SelectItem value="yes">Retro: Sí</SelectItem>
                  <SelectItem value="no">Retro: No</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sleeveFilter} onValueChange={setSleeveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Manga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las mangas</SelectItem>
                  <SelectItem value="short">Manga corta</SelectItem>
                  <SelectItem value="long">Manga larga</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders table - desktop */}
      <Card className="hidden lg:block">
        <CardContent className="pt-0">
          {pagedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ShoppingBag className="mb-3 h-12 w-12" />
              <p>No se encontraron pedidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Versión</TableHead>
                    <TableHead>Retro</TableHead>
                    <TableHead>Manga</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dorsal</TableHead>
                    <TableHead>Parche</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <TableCell className="font-semibold">
                        #{String(order.order_number).padStart(6, '0')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{order.size}</TableCell>
                      <TableCell className="uppercase">{order.version}</TableCell>
                      <TableCell>{order.retro ? 'Sí' : 'No'}</TableCell>
                      <TableCell>{order.sleeve === 'long' ? 'Larga' : 'Corta'}</TableCell>
                      <TableCell>{order.custom_name || '-'}</TableCell>
                      <TableCell>{order.custom_number ?? '-'}</TableCell>
                      <TableCell>{order.patch || '-'}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell className="font-semibold">{formatPrice(Number(order.total_price))}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[order.status])}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_COLORS[order.status])} />
                          {STATUS_LABELS[order.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Eye className="ml-auto h-4 w-4 text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders cards - mobile */}
      <div className="space-y-3 lg:hidden">
        {pagedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ShoppingBag className="mb-3 h-12 w-12" />
            <p>No se encontraron pedidos</p>
          </div>
        ) : (
          pagedOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer"
              onClick={() => router.push(`/admin/orders/${order.id}`)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      #{String(order.order_number).padStart(6, '0')}
                    </p>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatPrice(Number(order.total_price))}
                    </p>
                    <span className={cn('mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_COLORS[order.status])}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Talla: {order.size}</span>
                  <span>·</span>
                  <span className="uppercase">{order.version}</span>
                  <span>·</span>
                  <span>{order.sleeve === 'long' ? 'Manga larga' : 'Manga corta'}</span>
                  <span>·</span>
                  <span>Cant: {order.quantity}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
