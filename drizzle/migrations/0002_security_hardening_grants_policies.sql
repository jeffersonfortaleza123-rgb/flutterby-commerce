-- 1. Remove duplicate non-admin storage policies
DROP POLICY IF EXISTS "Authenticated users can upload store images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update store images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete store images" ON storage.objects;

-- 2. Remove unrestricted public INSERT policies (orders are created via the
--    validated SECURITY DEFINER function create_order_with_items)
DROP POLICY IF EXISTS "Anyone can create a customer record" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- 3. Tighten table grants: anon only reads the public catalog
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE ALL ON public.product_batches FROM anon;
REVOKE ALL ON public.stock_movements FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.product_variations FROM anon;
REVOKE ALL ON public.categories FROM anon;
REVOKE ALL ON public.banners FROM anon;
REVOKE ALL ON public.site_settings FROM anon;

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_variations TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.site_settings TO anon;

REVOKE ALL ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 4. Fix mutable search_path
CREATE OR REPLACE FUNCTION public.get_expiry_status(_expiry_date date)
RETURNS expiry_status
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _expiry_date < CURRENT_DATE THEN 'vencido'::public.expiry_status
    WHEN _expiry_date < CURRENT_DATE + INTERVAL '1 month' THEN 'vencendo'::public.expiry_status
    WHEN _expiry_date < CURRENT_DATE + INTERVAL '3 months' THEN 'proximo'::public.expiry_status
    ELSE 'normal'::public.expiry_status
  END
$function$;

-- 5. Revoke EXECUTE on internal SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.deduct_stock_fefo(uuid, integer, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.restock_from_order(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_stock_from_variations() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_order_status_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
