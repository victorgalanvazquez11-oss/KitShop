'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/pricing';
import type { Settings, Size, Patch } from '@/lib/types';
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Settings as SettingsIcon,
  Tag,
  Shirt,
  Euro,
  Store,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newSize, setNewSize] = useState('');
  const [newSizeGroup, setNewSizeGroup] = useState<'adult' | 'child'>('adult');
  const [newPatch, setNewPatch] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [settingsRes, sizesRes, patchesRes] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('sizes').select('*').order('sort_order'),
        supabase.from('patches').select('*').order('sort_order'),
      ]);
      if (settingsRes.data) setSettings(settingsRes.data as Settings);
      if (sizesRes.data) setSizes(sizesRes.data as Size[]);
      if (patchesRes.data) setPatches(patchesRes.data as Patch[]);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          store_name: settings.store_name,
          logo_url: settings.logo_url,
          hero_text: settings.hero_text,
          hero_subtext: settings.hero_subtext,
          base_price: settings.base_price,
          player_extra: settings.player_extra,
          retro_extra: settings.retro_extra,
          long_sleeve_extra: settings.long_sleeve_extra,
          name_extra: settings.name_extra,
          number_extra: settings.number_extra,
          patch_extra: settings.patch_extra,
          cost_per_shirt: settings.cost_per_shirt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
      toast.success('Configuración guardada correctamente');
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const addSize = async () => {
    if (!newSize.trim()) return;
    try {
      const groupSizes = sizes.filter((s) => s.size_group === newSizeGroup);
      const { data, error } = await supabase
        .from('sizes')
        .insert({
          label: newSize.trim(),
          sort_order: groupSizes.length + 1,
          size_group: newSizeGroup,
        })
        .select()
        .single();

      if (error) throw error;
      setSizes([...sizes, data as Size]);
      setNewSize('');
      toast.success('Talla añadida');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const deleteSize = async (id: string) => {
    try {
      const { error } = await supabase.from('sizes').delete().eq('id', id);
      if (error) throw error;
      setSizes(sizes.filter((s) => s.id !== id));
      toast.success('Talla eliminada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const addPatch = async () => {
    if (!newPatch.trim()) return;
    try {
      const { data, error } = await supabase
        .from('patches')
        .insert({ name: newPatch.trim(), sort_order: patches.length + 1 })
        .select()
        .single();

      if (error) throw error;
      setPatches([...patches, data as Patch]);
      setNewPatch('');
      toast.success('Parche añadido');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const deletePatch = async (id: string) => {
    try {
      const { error } = await supabase.from('patches').delete().eq('id', id);
      if (error) throw error;
      setPatches(patches.filter((p) => p.id !== id));
      toast.success('Parche eliminado');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!settings) return null;

  const priceFields = [
    { key: 'base_price', label: 'Precio base de la camiseta' },
    { key: 'player_extra', label: 'Extra versión Player' },
    { key: 'retro_extra', label: 'Extra Retro' },
    { key: 'long_sleeve_extra', label: 'Extra manga larga' },
    { key: 'name_extra', label: 'Extra nombre personalizado' },
    { key: 'number_extra', label: 'Extra dorsal' },
    { key: 'patch_extra', label: 'Extra parche' },
    { key: 'cost_per_shirt', label: 'Coste por camiseta (para beneficio)' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500">Gestiona precios, tallas, parches y la tienda</p>
      </div>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-slate-400" />
            Configuración general
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="store_name">Nombre de la tienda</Label>
              <Input
                id="store_name"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="logo_url">URL del logo (opcional)</Label>
              <Input
                id="logo_url"
                value={settings.logo_url ?? ''}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value || null })}
                placeholder="https://..."
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="hero_text">Texto principal de la página</Label>
            <Input
              id="hero_text"
              value={settings.hero_text}
              onChange={(e) => setSettings({ ...settings, hero_text: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="hero_subtext">Subtexto de la página</Label>
            <Input
              id="hero_subtext"
              value={settings.hero_subtext}
              onChange={(e) => setSettings({ ...settings, hero_subtext: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Euro className="h-5 w-5 text-slate-400" />
            Precios
          </CardTitle>
          <CardDescription>
            Estos precios se usan para calcular el total automáticamente. Los pedidos ya realizados conservan su precio original.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {priceFields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="relative mt-1.5">
                  <Input
                    id={field.key}
                    type="number"
                    step="0.01"
                    min={0}
                    value={settings[field.key]}
                    onChange={(e) =>
                      setSettings({ ...settings, [field.key]: parseFloat(e.target.value) || 0 })
                    }
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sizes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shirt className="h-5 w-5 text-slate-400" />
            Tallas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                <button
                  onClick={() => deleteSize(s.id)}
                  className="text-slate-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {s.size_group === 'child' && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                    NIÑO
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                <button
                  onClick={() => deleteSize(s.id)}
                  className="text-slate-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={newSizeGroup}
              onValueChange={(v) => setNewSizeGroup(v as 'adult' | 'child')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Talla adulto</SelectItem>
                <SelectItem value="child">Talla niño</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              placeholder="Nueva talla..."
              onKeyDown={(e) => e.key === 'Enter' && addSize()}
              className="max-w-xs"
            />
            <Button onClick={addSize} variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Añadir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-slate-400" />
            Parches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {patches.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                <button
                  onClick={() => deletePatch(p.id)}
                  className="text-slate-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPatch}
              onChange={(e) => setNewPatch(e.target.value)}
              placeholder="Nuevo parche..."
              onKeyDown={(e) => e.key === 'Enter' && addPatch()}
              className="max-w-xs"
            />
            <Button onClick={addPatch} variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Añadir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-slate-400" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>
            Actualiza la contraseña de acceso al panel de administración.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current_password">Contraseña actual</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Repetir contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <Button
            onClick={async () => {
              if (!newPassword || newPassword.length < 6) {
                toast.error('La nueva contraseña debe tener al menos 6 caracteres');
                return;
              }
              if (newPassword !== confirmPassword) {
                toast.error('Las contraseñas no coinciden');
                return;
              }
              setChangingPassword(true);
              try {
                const { error } = await supabase.auth.updateUser({
                  password: newPassword,
                });
                if (error) throw error;
                toast.success('Contraseña actualizada correctamente');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              } catch (err: any) {
                toast.error('Error al cambiar la contraseña: ' + err.message);
              } finally {
                setChangingPassword(false);
              }
            }}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Cambiar contraseña
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSaveSettings} disabled={savingSettings} size="lg" className="shadow-lg">
          {savingSettings ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Guardar configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
