-- =========================================================
-- FASE 3: Consulta de estoque em lote (usada pela loja pública
-- para mostrar "esgotado" na listagem de produtos sem precisar
-- de uma chamada por produto).
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_available_stock_map(_product_ids UUID[])
RETURNS TABLE(product_id UUID, available INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(SUM(b.quantity) FILTER (WHERE b.expiry_date >= CURRENT_DATE), 0)::INT AS available
  FROM unnest(_product_ids) AS p(id)
  LEFT JOIN public.product_batches b ON b.product_id = p.id
  GROUP BY p.id
$$;

GRANT EXECUTE ON FUNCTION public.get_available_stock_map(uuid[]) TO anon, authenticated;
