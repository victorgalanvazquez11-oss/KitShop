'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/pricing';
import type { Order, Settings } from '@/lib/types';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_DOT_COLORS } from '@/lib/types';
import {
  ShoppingBag,
  Clock,
  Package,
  Truck,
  CheckCircle,
  Euro,
  TrendingUp,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const [ordersRes, settingsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (settingsRes.data) setSettings(settingsRes.data as Settings);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'pendiente').length;
  const prepOrders = orders.filter((o) => o.status === 'en preparacion').length;
  const receivedOrders = orders.filter((o) => o.status === 'recibido').length;
  const completedOrders = orders.filter((o) => o.status === 'entregado').length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + Number(o.total_price), 0);
  const totalCost = settings
    ? orders
        .filter((o) => o.status !== 'cancelado')
        .reduce((sum, o) => sum + Number(settings.cost_per_shirt) * o.quantity, 0)
    : 0;
  const estimatedProfit = totalRevenue - totalCost;

  const statusCounts = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));

  const recentOrders = orders.slice(0, 5);

  const stats = [
    { label: 'Pedidos totales', value: totalOrders, icon: ShoppingBag, color: 'blue' },
    { label: 'Pendientes', value: pendingOrders, icon: Clock, color: 'amber' },
    { label: 'En preparación', value: prepOrders, icon: Package, color: 'purple' },
    { label: 'Recibidos', value: receivedOrders, icon: Package, color: 'cyan' },
    { label: 'Completados', value: completedOrders, icon: CheckCircle, color: 'emerald' },
    { label: 'Ingresos estimados', value: formatPrice(totalRevenue), icon: Euro, color: 'green' },
    { label: 'Beneficio estimado', value: formatPrice(estimatedProfit), icon: TrendingUp, color: 'teal' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    green: 'bg-green-50 text-green-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen general de tu tienda</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="animate-fade-in-up">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClasses[stat.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos por estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="rounded-lg border border-slate-200 p-3 text-center">
                <div className={`mx-auto mb-2 h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="mt-0.5 text-xs text-slate-500">{STATUS_LABELS[status]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pedidos recientes</CardTitle>
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No hay pedidos todavía</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[order.status]}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        #{String(order.order_number).padStart(6, '0')}
                      </p>
                      <p className="text-xs text-slate-500">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatPrice(Number(order.total_price))}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
