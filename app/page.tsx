'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { calculatePrice, formatPrice } from '@/lib/pricing';
import type { Settings, Size, Patch, ShirtVersion, SleeveType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Shirt,
  Upload,
  Check,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  PackageCheck,
  Image as ImageIcon,
  Tag,
  Hash,
  Sparkles,
  Layers,
  Repeat,
  ShoppingCart,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function OrderPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [discord, setDiscord] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [size, setSize] = useState('');
  const [nameOption, setNameOption] = useState<'none' | 'custom'>('none');
  const [customName, setCustomName] = useState('');
  const [numberOption, setNumberOption] = useState<'none' | 'custom'>('none');
  const [customNumber, setCustomNumber] = useState<string>('');
  const [patchOption, setPatchOption] = useState<'none' | 'patch'>('none');
  const [selectedPatch, setSelectedPatch] = useState('');
  const [customPatch, setCustomPatch] = useState('');
  const [version, setVersion] = useState<ShirtVersion>('fan');
  const [retro, setRetro] = useState(false);
  const [sleeve, setSleeve] = useState<SleeveType>('short');
  const [quantity, setQuantity] = useState(1);
  const [sizeGroup, setSizeGroup] = useState<'adult' | 'child'>('adult');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, sizesRes, patchesRes] = await Promise.all([
          supabase.from('settings').select('*').eq('id', 1).single(),
          supabase.from('sizes').select('*').order('sort_order'),
          supabase.from('patches').select('*').order('sort_order'),
        ]);

        if (settingsRes.data) setSettings(settingsRes.data);
        if (sizesRes.data) {
          setSizes(sizesRes.data);
          const adultSizes = sizesRes.data.filter(
            (s) => s.size_group === 'adult'
          );
          if (adultSizes.length > 0) setSize(adultSizes[0].label);
        }
        if (patchesRes.data) setPatches(patchesRes.data);
      } catch (err) {
        toast.error('Error al cargar los datos. Recarga la página.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const hasCustomName = nameOption === 'custom' && customName.trim() !== '';
  const hasCustomNumber = numberOption === 'custom' && customNumber.trim() !== '';
  const hasPatch =
    patchOption === 'patch' &&
    (selectedPatch !== 'Otro' ? selectedPatch !== '' : customPatch.trim() !== '');

  const priceBreakdown = settings
    ? calculatePrice(
        settings,
        version,
        retro,
        sleeve,
        hasCustomName,
        hasCustomNumber,
        hasPatch,
        quantity
      )
    : null;

  const toggleSizeGroup = (group: 'adult' | 'child') => {
    setSizeGroup(group);
    const groupSizes = sizes.filter((s) => s.size_group === group);
    if (groupSizes.length > 0) setSize(groupSizes[0].label);
    else setSize('');
  };

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Formato no válido. Usa JPG, PNG o WEBP.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('El archivo es demasiado grande. Máximo 5 MB.');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    },
    []
  );

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `orders/${fileName}`;

    const { error } = await supabase.storage
      .from('order-images')
      .upload(filePath, imageFile, { cacheControl: '3600' });

    if (error) {
      throw new Error('Error al subir la imagen: ' + error.message);
    }

    const { data: urlData } = supabase.storage
      .from('order-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      toast.error('El nombre es obligatorio');
      return false;
    }
    if (!discord.trim()) {
      toast.error('El usuario de contacto es obligatorio');
      return false;
    }
    if (!size) {
      toast.error('Selecciona una talla');
      return false;
    }
    if (nameOption === 'custom' && !customName.trim()) {
      toast.error('Introduce el nombre personalizado');
      return false;
    }
    if (numberOption === 'custom' && !customNumber.trim()) {
      toast.error('Introduce el dorsal');
      return false;
    }
    if (patchOption === 'patch') {
      if (selectedPatch === 'Otro' && !customPatch.trim()) {
        toast.error('Escribe el nombre del parche');
        return false;
      }
      if (selectedPatch !== 'Otro' && !selectedPatch) {
        toast.error('Selecciona un parche');
        return false;
      }
    }
    return true;
  };

  const handleReview = () => {
    if (!validateForm()) return;
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!settings) return;
    setSubmitting(true);

    try {
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        uploadedImageUrl = await uploadImage();
      }

      const patchValue =
        patchOption === 'patch'
          ? selectedPatch === 'Otro'
            ? customPatch.trim()
            : selectedPatch
          : null;

      const { data, error } = await supabase.rpc('create_order', {
        p_customer_name: customerName.trim(),
        p_discord: discord.trim(),
        p_size: size,
        p_phone: phone.trim() || null,
        p_image_url: uploadedImageUrl,
        p_custom_name: hasCustomName ? customName.trim() : null,
        p_custom_number: hasCustomNumber ? parseInt(customNumber, 10) : null,
        p_patch: patchValue,
        p_version: version,
        p_retro: retro,
        p_sleeve: sleeve,
        p_quantity: quantity,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setOrderNumber(data as number);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message || 'Error al realizar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setDiscord('');
    setPhone('');
    setNotes('');
    removeImage();
    setSize(sizes[0]?.label ?? '');
    setNameOption('none');
    setCustomName('');
    setNumberOption('none');
    setCustomNumber('');
    setPatchOption('none');
    setSelectedPatch('');
    setCustomPatch('');
    setVersion('fan');
    setRetro(false);
    setSleeve('short');
    setQuantity(1);
    setSizeGroup('adult');
    setOrderNumber(null);
    setStep('form');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (step === 'success' && orderNumber !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-lg animate-scale-in text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <PackageCheck className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900">
              ¡Pedido realizado correctamente!
            </h2>
            <p className="mb-6 text-slate-500">
              Tu número de pedido es
            </p>
            <div className="mb-8 inline-block rounded-xl bg-blue-50 px-8 py-4">
              <span className="text-4xl font-bold tracking-tight text-blue-600">
                #{String(orderNumber).padStart(6, '0')}
              </span>
            </div>
            <p className="mb-8 text-sm text-slate-500">
              Guarda este número para hacer seguimiento de tu pedido. Nos
              pondremos en contacto contigo pronto.
            </p>
            <Button onClick={resetForm} className="w-full" size="lg">
              Realizar otro pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => setStep('form')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al formulario
          </Button>

          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-2xl">Resumen del pedido</CardTitle>
              <CardDescription>
                Revisa todos los detalles antes de confirmar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {imagePreview && (
                <div className="flex justify-center">
                  <img
                    src={imagePreview}
                    alt="Camiseta"
                    className="max-h-64 rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <ReviewItem label="Cliente" value={customerName} />
                <ReviewItem label="Contacto" value={discord} />
                {phone && <ReviewItem label="Teléfono" value={phone} />}
                <ReviewItem label="Talla" value={size} />
                <ReviewItem
                  label="Nombre"
                  value={hasCustomName ? customName : 'Sin nombre'}
                />
                <ReviewItem
                  label="Dorsal"
                  value={hasCustomNumber ? customNumber : 'Sin dorsal'}
                />
                <ReviewItem
                  label="Parche"
                  value={
                    hasPatch
                      ? selectedPatch === 'Otro'
                        ? customPatch
                        : selectedPatch
                      : 'Sin parche'
                  }
                />
                <ReviewItem
                  label="Versión"
                  value={version === 'player' ? 'Player' : 'Fan'}
                />
                <ReviewItem label="Retro" value={retro ? 'Sí' : 'No'} />
                <ReviewItem
                  label="Manga"
                  value={sleeve === 'long' ? 'Manga larga' : 'Manga corta'}
                />
                <ReviewItem label="Cantidad" value={String(quantity)} />
              </div>

              {notes && (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-500">
                    Observaciones
                  </p>
                  <p className="text-sm text-slate-900">{notes}</p>
                </div>
              )}

              <Separator />

              {priceBreakdown && (
                <div className="space-y-2">
                  <h3 className="mb-3 font-semibold text-slate-900">
                    Desglose de precio
                  </h3>
                  <PriceRow
                    label="Camiseta base"
                    value={priceBreakdown.base}
                  />
                  {priceBreakdown.playerExtra > 0 && (
                    <PriceRow
                      label="Versión Player"
                      value={priceBreakdown.playerExtra}
                    />
                  )}
                  {priceBreakdown.retroExtra > 0 && (
                    <PriceRow label="Retro" value={priceBreakdown.retroExtra} />
                  )}
                  {priceBreakdown.longSleeveExtra > 0 && (
                    <PriceRow
                      label="Manga larga"
                      value={priceBreakdown.longSleeveExtra}
                    />
                  )}
                  {priceBreakdown.nameExtra > 0 && (
                    <PriceRow
                      label="Nombre"
                      value={priceBreakdown.nameExtra}
                    />
                  )}
                  {priceBreakdown.numberExtra > 0 && (
                    <PriceRow
                      label="Dorsal"
                      value={priceBreakdown.numberExtra}
                    />
                  )}
                  {priceBreakdown.patchExtra > 0 && (
                    <PriceRow
                      label="Parche"
                      value={priceBreakdown.patchExtra}
                    />
                  )}
                  <Separator />
                  <PriceRow
                    label="Precio por unidad"
                    value={priceBreakdown.unitTotal}
                  />
                  <PriceRow
                    label={`Cantidad: ${quantity}`}
                    value={priceBreakdown.unitTotal * quantity}
                  />
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-lg font-bold">TOTAL</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPrice(priceBreakdown.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="lg"
                className="w-full text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando pedido...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    CONFIRMAR PEDIDO
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Shirt className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="text-lg font-bold text-slate-900">
              {settings?.store_name || 'KitShop'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            className="text-slate-500 hover:text-slate-900"
          >
            <Lock className="mr-1.5 h-4 w-4" />
            Admin
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-16 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <Badge className="mb-4 border-white/30 bg-white/10 text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            Personalización total
          </Badge>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            {settings?.hero_text || 'Pide tu camiseta personalizada'}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-blue-100">
            {settings?.hero_subtext ||
              'Calidad premium, personalización total. Haz tu pedido en minutos.'}
          </p>
        </div>
      </section>

      {/* Form */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          {/* Customer Data */}
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  1
                </span>
                Tus datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="discord">
                  Discord o usuario de contacto{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discord"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="@usuario"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="notes">Observaciones (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cualquier detalle que quieras añadir..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  2
                </span>
                <ImageIcon className="h-5 w-5 text-slate-400" />
                Imagen de la camiseta
              </CardTitle>
              <CardDescription>
                Sube una imagen de referencia (JPG, PNG o WEBP, máx. 5 MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="max-h-72 rounded-lg border border-slate-200 object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute right-2 top-2"
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="imageUpload"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 transition-colors hover:border-blue-400 hover:bg-blue-50"
                >
                  <Upload className="mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    Haz clic para subir una imagen
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    JPG, PNG o WEBP - Máximo 5 MB
                  </p>
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Shirt Configuration */}
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  3
                </span>
                <Shirt className="h-5 w-5 text-slate-400" />
                Configuración de la camiseta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Size */}
              <div>
                <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>
              Talla <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextGroup = sizeGroup === 'adult' ? 'child' : 'adult';
                  toggleSizeGroup(nextGroup);
                  setShowSizeGuide(false);
                }}
                className={cn(
                  'rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all',
                  sizeGroup === 'child'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                )}
              >
                Talla niño
              </button>
              <button
                type="button"
                onClick={() => setShowSizeGuide((visible) => !visible)}
                className="text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
              >
                ¿No sabes qué talla?
              </button>
            </div>
          </div>
          {showSizeGuide && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-800">
                Guía de tallas {sizeGroup === 'child' ? 'infantil' : 'adulta'}
              </p>
              {sizeGroup === 'child' ? (
                <img
                  src="/child-size-guide.png"
                  alt="Tabla de medidas de tallas infantiles"
                  className="max-h-80 w-full rounded-lg border bg-white object-contain"
                />
  ) : (
  <img
  src="/adult-size-guide.png"
  alt="Tabla de medidas de tallas adultas, femeninas e infantiles"
  className="max-h-80 w-full rounded-lg border bg-white object-contain"
  />
  )}
            </div>
          )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes
                    .filter((s) => s.size_group === sizeGroup)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSize(s.label)}
                        className={cn(
                          'min-w-[3rem] rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                          size === s.label
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Version */}
              <div>
                <Label className="mb-2 block">
                  Versión <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    active={version === 'fan'}
                    onClick={() => setVersion('fan')}
                    icon={<Layers className="h-5 w-5" />}
                    title="Fan"
                    description="Sin coste extra"
                  />
                  <OptionCard
                    active={version === 'player'}
                    onClick={() => setVersion('player')}
                    icon={<Layers className="h-5 w-5" />}
                    title="Player"
                    description={
                      settings ? `+${formatPrice(settings.player_extra)}` : ''
                    }
                  />
                </div>
              </div>

              {/* Retro */}
              <div>
                <Label className="mb-2 block">Retro</Label>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    active={!retro}
                    onClick={() => setRetro(false)}
                    icon={<Repeat className="h-5 w-5" />}
                    title="No"
                    description="Estándar"
                  />
                  <OptionCard
                    active={retro}
                    onClick={() => setRetro(true)}
                    icon={<Repeat className="h-5 w-5" />}
                    title="Sí"
                    description={
                      settings ? `+${formatPrice(settings.retro_extra)}` : ''
                    }
                  />
                </div>
              </div>

              {/* Sleeve */}
              <div>
                <Label className="mb-2 block">Manga</Label>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    active={sleeve === 'short'}
                    onClick={() => setSleeve('short')}
                    icon={<Shirt className="h-5 w-5" />}
                    title="Manga corta"
                    description="Estándar"
                  />
                  <OptionCard
                    active={sleeve === 'long'}
                    onClick={() => setSleeve('long')}
                    icon={<Shirt className="h-5 w-5" />}
                    title="Manga larga"
                    description={
                      settings
                        ? `+${formatPrice(settings.long_sleeve_extra)}`
                        : ''
                    }
                  />
                </div>
              </div>

              {/* Custom Name */}
              <div>
                <Label className="mb-2 block">
                  <Tag className="mr-1 inline h-4 w-4" />
                  Nombre en la camiseta
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    active={nameOption === 'none'}
                    onClick={() => setNameOption('none')}
                    title="Sin nombre"
                    description="Sin coste extra"
                  />
                  <OptionCard
                    active={nameOption === 'custom'}
                    onClick={() => setNameOption('custom')}
                    title="Nombre personalizado"
                    description={
                      settings ? `+${formatPrice(settings.name_extra)}` : ''
                    }
                  />
                </div>
                {nameOption === 'custom' && (
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Escribe el nombre..."
                    maxLength={20}
                    className="mt-3"
                  />
                )}
              </div>

              {/* Custom Number */}
              <div>
                <Label className="mb-2 block">
                  <Hash className="mr-1 inline h-4 w-4" />
                  Dorsal
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    active={numberOption === 'none'}
                    onClick={() => setNumberOption('none')}
                    title="Sin dorsal"
                    description="Sin coste extra"
                  />
                  <OptionCard
                    active={numberOption === 'custom'}
                    onClick={() => setNumberOption('custom')}
                    title="Dorsal personalizado"
                    description={
                      settings ? `+${formatPrice(settings.number_extra)}` : ''
                    }
                  />
                </div>
                {numberOption === 'custom' && (
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={customNumber}
                    onChange={(e) => setCustomNumber(e.target.value)}
                    placeholder="0"
                    className="mt-3"
                  />
                )}
              </div>

              {/* Patch */}
              <div>
                <Label className="mb-2 block">Parche</Label>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    active={patchOption === 'none'}
                    onClick={() => setPatchOption('none')}
                    title="Sin parche"
                    description="Sin coste extra"
                  />
                  <OptionCard
                    active={patchOption === 'patch'}
                    onClick={() => setPatchOption('patch')}
                    title="Con parche"
                    description={
                      settings ? `+${formatPrice(settings.patch_extra)}` : ''
                    }
                  />
                </div>
                {patchOption === 'patch' && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {patches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatch(p.name)}
                          className={cn(
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
                            selectedPatch === p.name
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                          )}
                        >
                          {p.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedPatch('Otro')}
                        className={cn(
                          'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
                          selectedPatch === 'Otro'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                        )}
                      >
                        Otro
                      </button>
                    </div>
                    {selectedPatch === 'Otro' && (
                      <Input
                        value={customPatch}
                        onChange={(e) => setCustomPatch(e.target.value)}
                        placeholder="Escribe el nombre del parche..."
                        className="mt-2"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <Label className="mb-2 block">Cantidad</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                      )
                    }
                    className="w-20 text-center text-lg font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Price Summary */}
          {priceBreakdown && (
            <Card className="sticky bottom-4 animate-fade-in-up border-blue-200 bg-blue-50/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Precio por unidad: {formatPrice(priceBreakdown.unitTotal)}
                    </span>
                    <span className="text-slate-600">x {quantity}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPrice(priceBreakdown.grandTotal)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleReview}
                  size="lg"
                  className="mt-4 w-full text-base"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Revisar pedido
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-slate-400">
          {settings?.store_name || 'KitShop'} - Pedidos de camisetas
          personalizadas
        </div>
      </footer>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">
        {value > 0 ? `+${formatPrice(value)}` : formatPrice(value)}
      </span>
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-lg border-2 p-3 text-left transition-all',
        active
          ? 'border-blue-600 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-300'
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className={active ? 'text-blue-600' : 'text-slate-400'}>
            {icon}
          </span>
        )}
        <span
          className={cn(
            'text-sm font-semibold',
            active ? 'text-blue-700' : 'text-slate-700'
          )}
        >
          {title}
        </span>
      </div>
      {description && (
        <span className="mt-1 text-xs text-slate-500">{description}</span>
      )}
    </button>
  );
}
