-- =========================================================
-- FASE 6: Simplificar estoque — sai o controle por múltiplos
-- lotes, entra uma quantidade de estoque e uma validade únicas
-- por produto. Também adiciona código de barras.
--
-- As tabelas de lote (product_batches) NÃO são apagadas, só
-- deixam de ser usadas pelo app — assim nenhum histórico se perde.
-- =========================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Migra o que já existir em lotes para os campos novos do produto:
-- soma das quantidades não vencidas vira o estoque, e a validade mais
-- próxima (não vencida) vira a validade única do produto.
UPDATE public.products p
SET stock_quantity = COALESCE(agg.total_qty, 0),
    expiry_date = agg.earliest_expiry
FROM (
  SELECT
    product_id,
    SUM(quantity) FILTER (WHERE expiry_date >= CURRENT_DATE) AS total_qty,
    MIN(expiry_date) FILTER (WHERE expiry_date >= CURRENT_DATE) AS earliest_expiry
  FROM public.product_batches
  GROUP BY product_id
) agg
WHERE agg.product_id = p.id;

-- get_available_stock agora lê direto da coluna do produto.
CREATE OR REPLACE FUNCTION public.get_available_stock(_product_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(stock_quantity, 0) FROM public.products WHERE id = _product_id
$$;

-- get_available_stock_map idem, para vários produtos de uma vez.
CREATE OR REPLACE FUNCTION public.get_available_stock_map(_product_ids UUID[])
RETURNS TABLE(product_id UUID, available INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, COALESCE(pr.stock_quantity, 0)::INT AS available
  FROM unnest(_product_ids) AS p(id)
  LEFT JOIN public.products pr ON pr.id = p.id
$$;

-- Descontar estoque na criação do pedido: agora desconta direto da
-- coluna do produto, sem depender de lotes.
CREATE OR REPLACE FUNCTION public.deduct_stock_fefo(
  _product_id UUID,
  _quantity INT,
  _order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - _quantity
  WHERE id = _product_id AND stock_quantity >= _quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para o produto %', _product_id;
  END IF;

  INSERT INTO public.stock_movements (product_id, batch_id, movement_type, quantity, reason, order_id)
  VALUES (_product_id, NULL, 'saida', _quantity, 'Baixa por criação de pedido', _order_id);
END;
$$;

-- Devolver estoque ao cancelar: soma tudo que saiu daquele produto
-- naquele pedido e devolve de uma vez, registrando a devolução.
CREATE OR REPLACE FUNCTION public.restock_from_order(
  _product_id UUID,
  _order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_out INT;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO _total_out
  FROM public.stock_movements
  WHERE product_id = _product_id AND order_id = _order_id AND movement_type = 'saida';

  IF _total_out > 0 THEN
    UPDATE public.products SET stock_quantity = stock_quantity + _total_out WHERE id = _product_id;

    INSERT INTO public.stock_movements (product_id, batch_id, movement_type, quantity, reason, order_id)
    VALUES (_product_id, NULL, 'devolucao', _total_out, 'Devolução por cancelamento de pedido', _order_id);
  END IF;
END;
$$;
