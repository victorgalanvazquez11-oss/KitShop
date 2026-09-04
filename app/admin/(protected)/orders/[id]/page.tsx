'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatPrice } from '@/lib/pricing';
import type { Order, OrderStatus, ShirtVersion, SleeveType, Size } from '@/lib/types';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS } from '@/lib/types';
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Image as ImageIcon,
  Calendar,
  User,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editData, setEditData] = useState<Partial<Order>>({});

  useEffect(() => {
    async function loadData() {
      const [orderRes, sizesRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).maybeSingle(),
        supabase.from('sizes').select('*').order('sort_order'),
      ]);
      if (orderRes.data) {
        const o = orderRes.data as Order;
        setOrder(o);
        setEditData(o);
      } else {
        toast.error('Pedido no encontrado');
        router.push('/admin/orders');
      }
      if (sizesRes.data) setSizes(sizesRes.data as Size[]);
      setLoading(false);
    }
    loadData();
  }, [id, router]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);

    try {
      const updates = {
        customer_name: editData.customer_name,
        discord: editData.discord,
        phone: editData.phone,
        size: editData.size,
        custom_name: editData.custom_name,
        custom_number: editData.custom_number,
        patch: editData.patch,
        version: editData.version,
        retro: editData.retro,
        sleeve: editData.sleeve,
        quantity: editData.quantity,
        total_price: editData.total_price,
        status: editData.status,
        notes: editData.notes,
      };

      const { error } = await supabase.from('orders').update(updates).eq('id', order.id);

      if (error) throw error;

      toast.success('Pedido actualizado correctamente');
      setOrder({ ...order, ...updates } as Order);
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    setDeleting(true);

    try {
      if (order.image_url) {
        const pathMatch = order.image_url.match(/\/order-images\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('order-images').remove([pathMatch[1]]);
        }
      }

      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (error) throw error;

      toast.success('Pedido eliminado');
      router.push('/admin/orders');
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pedido #{String(order.order_number).padStart(6, '0')}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[order.status])}>
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_COLORS[order.status])} />
                {STATUS_LABELS[order.status]}
              </span>
              <span className="text-sm text-slate-400">
                {new Date(order.created_at).toLocaleString('es-ES')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. El pedido #{String(order.order_number).padStart(6, '0')} y su imagen se eliminarán permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: image + price */}
        <div className="space-y-6">
          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5 text-slate-400" />
                Imagen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.image_url ? (
                <img
                  src={order.image_url}
                  alt="Camiseta"
                  className="w-full rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-slate-400">
                  <ImageIcon className="mb-2 h-10 w-10" />
                  <p className="text-sm">Sin imagen</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Precio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <PriceRow label="Precio base" value={Number(order.base_price)} />
              <PriceRow label="Extras" value={Number(order.extras_price)} />
              <PriceRow label="Precio por unidad" value={Number(order.base_price) + Number(order.extras_price)} />
              <PriceRow label={`Cantidad: ${order.quantity}`} value={(Number(order.base_price) + Number(order.extras_price)) * order.quantity} />
              <Separator />
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-xl font-bold text-blue-600">{formatPrice(Number(order.total_price))}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: editable fields */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-slate-400" />
                Datos del cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit_name">Nombre</Label>
                  <Input
                    id="edit_name"
                    value={editData.customer_name ?? ''}
                    onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_discord">Discord / Contacto</Label>
                  <Input
                    id="edit_discord"
                    value={editData.discord ?? ''}
                    onChange={(e) => setEditData({ ...editData, discord: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_phone">Teléfono</Label>
                  <Input
                    id="edit_phone"
                    value={editData.phone ?? ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_notes">Observaciones</Label>
                <Textarea
                  id="edit_notes"
                  value={editData.notes ?? ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shirt config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de la camiseta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Talla</Label>
                  <Select
                    value={editData.size ?? ''}
                    onValueChange={(v) => setEditData({ ...editData, size: v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((s) => (
                        <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Versión</Label>
                  <Select
                    value={editData.version ?? 'fan'}
                    onValueChange={(v) => setEditData({ ...editData, version: v as ShirtVersion })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fan">Fan</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Manga</Label>
                  <Select
                    value={editData.sleeve ?? 'short'}
                    onValueChange={(v) => setEditData({ ...editData, sleeve: v as SleeveType })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Manga corta</SelectItem>
                      <SelectItem value="long">Manga larga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_custom_name">Nombre personalizado</Label>
                  <Input
                    id="edit_custom_name"
                    value={editData.custom_name ?? ''}
                    onChange={(e) => setEditData({ ...editData, custom_name: e.target.value || null })}
                    placeholder="Vacío = sin nombre"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_custom_number">Dorsal</Label>
                  <Input
                    id="edit_custom_number"
                    type="number"
                    min={0}
                    max={999}
                    value={editData.custom_number ?? ''}
                    onChange={(e) => setEditData({ ...editData, custom_number: e.target.value ? parseInt(e.target.value, 10) : null })}
                    placeholder="Vacío = sin dorsal"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_patch">Parche</Label>
                  <Input
                    id="edit_patch"
                    value={editData.patch ?? ''}
                    onChange={(e) => setEditData({ ...editData, patch: e.target.value || null })}
                    placeholder="Vacío = sin parche"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <Label className="font-medium">Retro</Label>
                  <p className="text-xs text-slate-500">¿Es una camiseta retro?</p>
                </div>
                <Switch
                  checked={editData.retro ?? false}
                  onCheckedChange={(v) => setEditData({ ...editData, retro: v })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit_quantity">Cantidad</Label>
                  <Input
                    id="edit_quantity"
                    type="number"
                    min={1}
                    max={100}
                    value={editData.quantity ?? 1}
                    onChange={(e) => setEditData({ ...editData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_total">Precio total (€)</Label>
                  <Input
                    id="edit_total"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editData.total_price ?? 0}
                    onChange={(e) => setEditData({ ...editData, total_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado del pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={editData.status ?? 'pendiente'}
                onValueChange={(v) => setEditData({ ...editData, status: v as OrderStatus })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS[s])} />
                        {STATUS_LABELS[s]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{formatPrice(value)}</span>
    </div>
  );
}
