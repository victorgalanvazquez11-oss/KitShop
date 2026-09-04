/*
# Football Shirt Order Management - Initial Schema

## Overview
Complete database schema for a football shirt order management system with:
- Public order form (customers create orders without login)
- Private admin panel (manage orders, settings, sizes, patches)

## New Tables

### settings (singleton row, id=1)
- Store configuration: name, logo URL, hero text
- Pricing: base price, extras for player/retro/long-sleeve/name/number/patch
- Cost per shirt for profit estimation

### sizes
- Configurable shirt sizes with sort order
- Seed: XS, S, M, L, XL, XXL, XXXL

### patches
- Configurable patch list with sort order
- Seed: Champions League, Premier League, LaLiga, Europa League, Mundial

### orders
- Full order details: customer info, shirt config, image URL
- Server-calculated prices (base_price, extras_price, total_price)
- Sequential order_number via Postgres sequence
- Status workflow: pendiente, confirmado, en preparacion, pedido al proveedor, recibido, enviado, entregado, cancelado

## Security (RLS)
- orders: anon can INSERT only via create_order() SECURITY DEFINER function; authenticated (admin) can SELECT/UPDATE/DELETE
- settings: anon+authenticated can SELECT; authenticated can UPDATE
- sizes: anon+authenticated can SELECT; authenticated can INSERT/UPDATE/DELETE
- patches: anon+authenticated can SELECT; authenticated can INSERT/UPDATE/DELETE
- Storage bucket 'order-images': anon can upload+read; authenticated can read+delete

## Important Notes
1. create_order() calculates prices from settings table server-side — client cannot manipulate price
2. Order numbers are sequential via order_number_seq sequence
3. Admin user created via Supabase Auth dashboard (no public sign-up)
4. Prices stored per-order so historical orders keep their original price
*/

-- ============================
-- SETTINGS TABLE (singleton)
-- ============================
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1,
  store_name text NOT NULL DEFAULT 'KitShop',
  logo_url text,
  hero_text text NOT NULL DEFAULT 'Pide tu camiseta personalizada',
  hero_subtext text NOT NULL DEFAULT 'Calidad premium, personalización total. Haz tu pedido en minutos.',
  base_price numeric(10,2) NOT NULL DEFAULT 15.00,
  player_extra numeric(10,2) NOT NULL DEFAULT 5.00,
  retro_extra numeric(10,2) NOT NULL DEFAULT 3.00,
  long_sleeve_extra numeric(10,2) NOT NULL DEFAULT 4.00,
  name_extra numeric(10,2) NOT NULL DEFAULT 2.00,
  number_extra numeric(10,2) NOT NULL DEFAULT 2.00,
  patch_extra numeric(10,2) NOT NULL DEFAULT 1.50,
  cost_per_shirt numeric(10,2) NOT NULL DEFAULT 8.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);

INSERT INTO settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================
-- SIZES TABLE
-- ============================
CREATE TABLE IF NOT EXISTS sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO sizes (label, sort_order) VALUES
  ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5), ('XXL', 6), ('XXXL', 7)
ON CONFLICT (label) DO NOTHING;

-- ============================
-- PATCHES TABLE
-- ============================
CREATE TABLE IF NOT EXISTS patches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO patches (name, sort_order) VALUES
  ('Champions League', 1),
  ('Premier League', 2),
  ('LaLiga', 3),
  ('Europa League', 4),
  ('Mundial', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================
-- ORDERS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  customer_name text NOT NULL,
  discord text NOT NULL,
  phone text,
  image_url text,
  size text NOT NULL,
  custom_name text,
  custom_number integer,
  patch text,
  version text NOT NULL DEFAULT 'fan',
  retro boolean NOT NULL DEFAULT false,
  sleeve text NOT NULL DEFAULT 'short',
  quantity integer NOT NULL DEFAULT 1,
  base_price numeric(10,2) NOT NULL,
  extras_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  notes text
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- ============================
-- ORDER NUMBER SEQUENCE
-- ============================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ============================
-- CREATE_ORDER FUNCTION (SECURITY DEFINER)
-- ============================
-- Public users call this to create orders. Price is calculated server-side.
-- Parameters without defaults come first, then those with defaults.
CREATE OR REPLACE FUNCTION create_order(
  p_customer_name text,
  p_discord text,
  p_size text,
  p_phone text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_custom_name text DEFAULT NULL,
  p_custom_number integer DEFAULT NULL,
  p_patch text DEFAULT NULL,
  p_version text DEFAULT 'fan',
  p_retro boolean DEFAULT false,
  p_sleeve text DEFAULT 'short',
  p_quantity integer DEFAULT 1,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_number integer;
  v_base_price numeric(10,2);
  v_extras_price numeric(10,2) := 0;
  v_total_price numeric(10,2);
  v_settings record;
BEGIN
  -- Validate required fields
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio';
  END IF;

  IF p_discord IS NULL OR btrim(p_discord) = '' THEN
    RAISE EXCEPTION 'El usuario de contacto es obligatorio';
  END IF;

  IF p_size IS NULL OR btrim(p_size) = '' THEN
    RAISE EXCEPTION 'La talla es obligatoria';
  END IF;

  -- Validate version
  IF p_version NOT IN ('fan', 'player') THEN
    RAISE EXCEPTION 'Versión no válida';
  END IF;

  -- Validate sleeve
  IF p_sleeve NOT IN ('short', 'long') THEN
    RAISE EXCEPTION 'Tipo de manga no válido';
  END IF;

  -- Validate quantity
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'La cantidad debe estar entre 1 y 100';
  END IF;

  -- Validate size exists
  IF NOT EXISTS (SELECT 1 FROM sizes WHERE label = p_size) THEN
    RAISE EXCEPTION 'Talla no válida';
  END IF;

  -- Validate custom_number if provided
  IF p_custom_number IS NOT NULL AND (p_custom_number < 0 OR p_custom_number > 999) THEN
    RAISE EXCEPTION 'El dorsal debe estar entre 0 y 999';
  END IF;

  -- Get current settings (prices)
  SELECT * INTO v_settings FROM settings WHERE id = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuración no encontrada';
  END IF;

  -- Calculate base price
  v_base_price := v_settings.base_price;

  -- Calculate extras
  IF p_version = 'player' THEN
    v_extras_price := v_extras_price + v_settings.player_extra;
  END IF;

  IF p_retro = true THEN
    v_extras_price := v_extras_price + v_settings.retro_extra;
  END IF;

  IF p_sleeve = 'long' THEN
    v_extras_price := v_extras_price + v_settings.long_sleeve_extra;
  END IF;

  IF p_custom_name IS NOT NULL AND btrim(p_custom_name) <> '' THEN
    v_extras_price := v_extras_price + v_settings.name_extra;
  END IF;

  IF p_custom_number IS NOT NULL THEN
    v_extras_price := v_extras_price + v_settings.number_extra;
  END IF;

  IF p_patch IS NOT NULL AND btrim(p_patch) <> '' AND p_patch <> 'Sin parche' THEN
    v_extras_price := v_extras_price + v_settings.patch_extra;
  END IF;

  -- Calculate total
  v_total_price := (v_base_price + v_extras_price) * p_quantity;

  -- Generate order number
  v_order_number := nextval('order_number_seq');

  -- Insert order
  INSERT INTO orders (
    order_number, customer_name, discord, phone, image_url,
    size, custom_name, custom_number, patch, version, retro, sleeve,
    quantity, base_price, extras_price, total_price, notes
  ) VALUES (
    v_order_number, p_customer_name, p_discord, p_phone, p_image_url,
    p_size, NULLIF(btrim(p_custom_name), ''), p_custom_number,
    NULLIF(btrim(p_patch), ''), p_version, p_retro, p_sleeve,
    p_quantity, v_base_price, v_extras_price, v_total_price, NULLIF(btrim(p_notes), '')
  );

  RETURN v_order_number;
END;
$$;

-- Grant execute to anon (public users) and authenticated (admin)
GRANT EXECUTE ON FUNCTION create_order TO anon, authenticated;

-- ============================
-- ROW LEVEL SECURITY
-- ============================

-- ORDERS: anon can only insert via function; authenticated can do everything
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_orders" ON orders;
CREATE POLICY "admin_select_orders" ON orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_orders" ON orders;
CREATE POLICY "admin_delete_orders" ON orders
  FOR DELETE TO authenticated USING (true);

-- Note: no INSERT policy on orders table — inserts go through create_order() SECURITY DEFINER function

-- SETTINGS: public can read; admin can update
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON settings;
CREATE POLICY "public_read_settings" ON settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_settings" ON settings;
CREATE POLICY "admin_update_settings" ON settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SIZES: public can read; admin can CRUD
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_sizes" ON sizes;
CREATE POLICY "public_read_sizes" ON sizes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_sizes" ON sizes;
CREATE POLICY "admin_insert_sizes" ON sizes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_sizes" ON sizes;
CREATE POLICY "admin_update_sizes" ON sizes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_sizes" ON sizes;
CREATE POLICY "admin_delete_sizes" ON sizes
  FOR DELETE TO authenticated USING (true);

-- PATCHES: public can read; admin can CRUD
ALTER TABLE patches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_patches" ON patches;
CREATE POLICY "public_read_patches" ON patches
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_patches" ON patches;
CREATE POLICY "admin_insert_patches" ON patches
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_patches" ON patches;
CREATE POLICY "admin_update_patches" ON patches
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_patches" ON patches;
CREATE POLICY "admin_delete_patches" ON patches
  FOR DELETE TO authenticated USING (true);

-- ============================
-- STORAGE BUCKET
-- ============================
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order-images bucket
DROP POLICY IF EXISTS "anon_upload_order_images" ON storage.objects;
CREATE POLICY "anon_upload_order_images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'order-images');

DROP POLICY IF EXISTS "public_read_order_images" ON storage.objects;
CREATE POLICY "public_read_order_images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'order-images');

DROP POLICY IF EXISTS "admin_delete_order_images" ON storage.objects;
CREATE POLICY "admin_delete_order_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'order-images');