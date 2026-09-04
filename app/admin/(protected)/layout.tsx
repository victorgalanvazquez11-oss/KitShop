'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, LayoutDashboard, ShoppingBag, Settings, LogOut, Shirt, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (!data.session) {
        router.replace('/admin');
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || !session) {
          router.replace('/admin');
        }
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
    { href: '/admin/settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Shirt className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">KitShop Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Shirt className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">KitShop Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 truncate px-3 text-xs text-slate-400">
            {session.user.email}
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Sidebar - mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white">
            <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Shirt className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-slate-900">KitShop Admin</span>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <div className="mb-3 truncate px-3 text-xs text-slate-400">
                {session.user.email}
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Cerrar sesión
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
