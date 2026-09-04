'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatPrice } from '@/lib/pricing';
import type { Order, OrderStatus, Size } from '@/lib/types';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS } from '@/lib/types';
import { Search, Loader2, Eye, ChevronLeft, ChevronRight, ShoppingBag, Trash2, Phone, MessageSquare, User, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');
  const [retroFilter, setRetroFilter] = useState('all');
  const [sleeveFilter, setSleeveFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [ordersRes, sizesRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('sizes').select('*').order('sort_order'),
    ]);
    if (ordersRes.error) toast.error('No se pudieron cargar los pedidos');
    if (ordersRes.data) setOrders(ordersRes.data as Order[]);
    if (sizesRes.data) setSizes(sizesRes.data as Size[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || o.customer_name.toLowerCase().includes(q) || o.discord.toLowerCase().includes(q) || (o.phone?.toLowerCase().includes(q) ?? false) || String(o.order_number).includes(q);
    return matchesSearch && (statusFilter === 'all' || o.status === statusFilter) && (sizeFilter === 'all' || o.size === sizeFilter) && (versionFilter === 'all' || o.version === versionFilter) && (retroFilter === 'all' || o.retro === (retroFilter === 'yes')) && (sleeveFilter === 'all' || o.sleeve === sleeveFilter);
  }), [orders, search, statusFilter, sizeFilter, versionFilter, retroFilter, sleeveFilter]);
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const pagedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  useEffect(() => setPage(0), [search, statusFilter, sizeFilter, versionFilter, retroFilter, sleeveFilter]);

  const updateStatus = async (status: OrderStatus) => {
    if (!selectedOrder) return;
    setSaving(true);
    const { error } = await supabase.from('orders').update({ status }).eq('id', selectedOrder.id);
    if (error) toast.error('No se pudo actualizar el estado');
    else {
      const updated = { ...selectedOrder, status };
      setSelectedOrder(updated);
      setOrders((current) => current.map((o) => o.id === updated.id ? updated : o));
      toast.success('Estado actualizado');
    }
    setSaving(false);
  };

  const deleteOrder = async () => {
    if (!pendingDelete) return;
    const order = pendingDelete;
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) { toast.error('No se pudo eliminar el pedido'); return; }
    setOrders((current) => current.filter((o) => o.id !== order.id));
    setPendingDelete(null);
    setSelectedOrder(null);
    toast.success('Pedido eliminado');
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Pedidos</h1><p className="text-sm text-slate-500">{filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}</p></div>
      <Card><CardContent className="pt-5"><div className="space-y-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar por número, nombre, discord o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Estado"><SelectItem value="all">Todos los estados</SelectItem>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</FilterSelect>
          <FilterSelect value={sizeFilter} onChange={setSizeFilter} placeholder="Talla"><SelectItem value="all">Todas las tallas</SelectItem>{sizes.map((s) => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</FilterSelect>
          <FilterSelect value={versionFilter} onChange={setVersionFilter} placeholder="Versión"><SelectItem value="all">Todas las versiones</SelectItem><SelectItem value="fan">Fan</SelectItem><SelectItem value="player">Player</SelectItem></FilterSelect>
          <FilterSelect value={retroFilter} onChange={setRetroFilter} placeholder="Retro"><SelectItem value="all">Retro: Todos</SelectItem><SelectItem value="yes">Retro: Sí</SelectItem><SelectItem value="no">Retro: No</SelectItem></FilterSelect>
          <FilterSelect value={sleeveFilter} onChange={setSleeveFilter} placeholder="Manga"><SelectItem value="all">Todas las mangas</SelectItem><SelectItem value="short">Manga corta</SelectItem><SelectItem value="long">Manga larga</SelectItem></FilterSelect>
        </div>
      </div></CardContent></Card>

      <Card><CardContent className="pt-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nº Pedido</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Talla</TableHead><TableHead>Versión</TableHead><TableHead>Nombre</TableHead><TableHead>Dorsal</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader><TableBody>
        {pagedOrders.map((order) => <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrder(order)}><TableCell className="font-semibold">#{String(order.order_number).padStart(6, '0')}</TableCell><TableCell className="whitespace-nowrap text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString('es-ES')}</TableCell><TableCell className="font-medium">{order.customer_name}</TableCell><TableCell>{order.size}</TableCell><TableCell className="uppercase">{order.version}</TableCell><TableCell>{order.custom_name || '-'}</TableCell><TableCell>{order.custom_number ?? '-'}</TableCell><TableCell>{order.quantity}</TableCell><TableCell className="font-semibold">{formatPrice(Number(order.total_price))}</TableCell><TableCell><StatusBadge status={order.status} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" aria-label="Ver pedido" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}><Eye className="h-4 w-4 text-slate-500" /></Button></TableCell></TableRow>)}
      </TableBody></Table>{pagedOrders.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-slate-400"><ShoppingBag className="mb-3 h-12 w-12" /><p>No se encontraron pedidos</p></div>}</div></CardContent></Card>

      {totalPages > 1 && <div className="flex items-center justify-center gap-2"><Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm text-slate-500">Página {page + 1} de {totalPages}</span><Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button></div>}

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Pedido #{selectedOrder && String(selectedOrder.order_number).padStart(6, '0')}</DialogTitle><DialogDescription>Toda la información del pedido y su progreso.</DialogDescription></DialogHeader>{selectedOrder && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-[180px_1fr]"><div>{selectedOrder.image_url ? <img src={selectedOrder.image_url} alt="Imagen enviada del pedido" className="max-h-56 w-full rounded-lg border object-contain" /> : <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-slate-400"><ImageIcon /></div>}</div><div className="grid gap-3 sm:grid-cols-2"><Info icon={<User />} label="Cliente" value={selectedOrder.customer_name} /><Info icon={<MessageSquare />} label="Discord / contacto" value={selectedOrder.discord} /><Info icon={<Phone />} label="Teléfono" value={selectedOrder.phone || 'No indicado'} /><Info label="Fecha" value={new Date(selectedOrder.created_at).toLocaleString('es-ES')} /><Info label="Talla" value={selectedOrder.size} /><Info label="Versión" value={selectedOrder.version === 'player' ? 'Player' : 'Fan'} /><Info label="Manga" value={selectedOrder.sleeve === 'long' ? 'Larga' : 'Corta'} /><Info label="Retro" value={selectedOrder.retro ? 'Sí' : 'No'} /><Info label="Nombre" value={selectedOrder.custom_name || 'Sin nombre'} /><Info label="Dorsal" value={String(selectedOrder.custom_number ?? 'Sin dorsal')} /><Info label="Parche" value={selectedOrder.patch || 'Sin parche'} /><Info label="Cantidad" value={String(selectedOrder.quantity)} /></div></div><div className="rounded-lg border bg-slate-50 p-4"><p className="mb-2 text-sm font-semibold text-slate-700">Estado del pedido</p><Select value={selectedOrder.status} onValueChange={(value) => updateStatus(value as OrderStatus)} disabled={saving}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}><span className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS[s])} />{STATUS_LABELS[s]}</span></SelectItem>)}</SelectContent></Select></div>{selectedOrder.notes && <div><p className="text-sm font-semibold text-slate-700">Observaciones</p><p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{selectedOrder.notes}</p></div>}<div className="flex items-center justify-between border-t pt-4"><span className="font-semibold">Total</span><span className="text-xl font-bold text-blue-600">{formatPrice(Number(selectedOrder.total_price))}</span></div><Button variant="destructive" onClick={() => setPendingDelete(selectedOrder)}><Trash2 className="mr-2 h-4 w-4" />Eliminar pedido</Button></div>}</DialogContent></Dialog>
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará toda la información del pedido.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={deleteOrder}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, children }: { value: string; onChange: (value: string) => void; placeholder: string; children: React.ReactNode }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{children}</SelectContent></Select>; }
function StatusBadge({ status }: { status: OrderStatus }) { return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[status])}><span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_COLORS[status])} />{STATUS_LABELS[status]}</span>; }
function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) { return <div className="min-w-0"><p className="flex items-center gap-1 text-xs text-slate-500">{icon && <span className="h-3.5 w-3.5">{icon}</span>}{label}</p><p className="truncate text-sm font-medium text-slate-900">{value}</p></div>; }

