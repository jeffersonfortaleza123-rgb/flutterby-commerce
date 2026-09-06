-- =========================================================
-- FASE 7: Módulo completo de cadastro de produtos
-- Adiciona: tipo de produto (determina campos de variação),
-- SKU, fornecedor, estoque mínimo, lote, e uma tabela de
-- VARIAÇÕES reais (tamanho/cor, numeração/cor, tonalidade, etc)
-- com estoque próprio por variação.
-- =========================================================

-- Tipo de produto: determina quais campos de variação fazem sentido
-- no formulário (roupas usa tamanho/cor, tênis usa numeração/cor, etc).
-- Independente da tabela "categories" já existente, que é livre e
-- usada pra navegação/filtro na loja.
CREATE TYPE public.product_type AS ENUM (
  'maquiagem', 'roupas', 'tenis', 'cosmeticos', 'utilidades', 'outros'
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type public.product_type NOT NULL DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS min_stock INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS batch_label TEXT;

-- SKU único quando informado (permite múltiplos produtos sem SKU ainda)
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx
  ON public.products (sku) WHERE sku IS NOT NULL AND sku <> '';

-- ---------------------------------------------------------
-- VARIAÇÕES (tamanho/cor, numeração/cor, tonalidade, volume, etc)
-- attributes guarda um JSON livre, ex: {"tamanho":"M","cor":"Preto"}
-- ---------------------------------------------------------
CREATE TABLE public.product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  price NUMERIC(10,2), -- null = usa o preço do produto principal
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_variations_sku_unique_idx
  ON public.product_variations (sku) WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX idx_product_variations_product_id ON public.product_variations(product_id);

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variations of active products" ON public.product_variations
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.active = true));

CREATE POLICY "Admins can manage variations" ON public.product_variations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_variations_updated_at
  BEFORE UPDATE ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mantém products.stock_quantity sempre igual à soma das variações,
-- quando o produto tiver alguma. Assim toda a lógica de estoque que
-- já existe (get_available_stock, checkout, dashboard) continua
-- funcionando sem precisar saber se o produto tem variação ou não.
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product_id UUID := COALESCE(NEW.product_id, OLD.product_id);
  _total INT;
BEGIN
  SELECT COALESCE(SUM(stock_quantity), 0) INTO _total
  FROM public.product_variations
  WHERE product_id = _product_id;

  UPDATE public.products SET stock_quantity = _total WHERE id = _product_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_stock_on_variation_change
  AFTER INSERT OR UPDATE OF stock_quantity OR DELETE ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_variations();

-- ---------------------------------------------------------
-- Pedidos passam a poder referenciar uma variação específica
-- ---------------------------------------------------------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variation_label TEXT;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL;

-- create_order_with_items agora aceita um variation_id opcional por item.
-- Se vier, valida e desconta o estoque da VARIAÇÃO (o gatilho acima
-- atualiza o total do produto sozinho). Se não vier, comportamento
-- igual a antes (desconta do produto direto).
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _customer_name TEXT,
  _customer_phone TEXT,
  _customer_address TEXT,
  _items JSONB,
  _notes TEXT DEFAULT NULL
)
RETURNS TABLE(order_id UUID, order_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_id UUID;
  _order_id UUID;
  _order_number INT;
  _item JSONB;
  _product_id UUID;
  _variation_id UUID;
  _quantity INT;
  _product RECORD;
  _variation RECORD;
  _available INT;
  _unit_price NUMERIC(10,2);
  _variation_label TEXT;
  _total NUMERIC(10,2) := 0;
BEGIN
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens';
  END IF;
  IF _customer_name IS NULL OR trim(_customer_name) = '' THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;
  IF _customer_phone IS NULL OR trim(_customer_phone) = '' THEN
    RAISE EXCEPTION 'Telefone do cliente é obrigatório';
  END IF;

  -- 1) Validar tudo antes de gravar
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _product_id := (_item->>'product_id')::UUID;
    _variation_id := NULLIF(_item->>'variation_id', '')::UUID;
    _quantity := (_item->>'quantity')::INT;

    IF _quantity IS NULL OR _quantity <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para um dos itens';
    END IF;

    SELECT * INTO _product FROM public.products WHERE id = _product_id AND active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado ou indisponível';
    END IF;

    IF _variation_id IS NOT NULL THEN
      SELECT * INTO _variation FROM public.product_variations WHERE id = _variation_id AND product_id = _product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variação não encontrada para o produto "%"', _product.name;
      END IF;
      IF _variation.stock_quantity < _quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %', _product.name, _variation.stock_quantity, _quantity;
      END IF;
      _total := _total + COALESCE(_variation.price, _product.price) * _quantity;
    ELSE
      _available := public.get_available_stock(_product_id);
      IF _available < _quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %', _product.name, _available, _quantity;
      END IF;
      _total := _total + (_product.price * _quantity);
    END IF;
  END LOOP;

  -- 2) Cliente
  INSERT INTO public.customers (name, phone, address)
  VALUES (trim(_customer_name), trim(_customer_phone), NULLIF(trim(_customer_address), ''))
  RETURNING id INTO _customer_id;

  -- 3) Pedido
  INSERT INTO public.orders (customer_id, total, notes)
  VALUES (_customer_id, _total, _notes)
  RETURNING id, orders.order_number INTO _order_id, _order_number;

  -- 4) Itens + baixa de estoque (produto ou variação)
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _product_id := (_item->>'product_id')::UUID;
    _variation_id := NULLIF(_item->>'variation_id', '')::UUID;
    _quantity := (_item->>'quantity')::INT;
    SELECT * INTO _product FROM public.products WHERE id = _product_id;

    IF _variation_id IS NOT NULL THEN
      SELECT * INTO _variation FROM public.product_variations WHERE id = _variation_id;
      _unit_price := COALESCE(_variation.price, _product.price);
      _variation_label := (
        SELECT string_agg(value::text, ' / ')
        FROM jsonb_each_text(_variation.attributes)
      );

      UPDATE public.product_variations
      SET stock_quantity = stock_quantity - _quantity
      WHERE id = _variation_id AND stock_quantity >= _quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Estoque insuficiente para "%"', _product.name;
      END IF;

      INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, variation_id, variation_label)
      VALUES (_order_id, _product_id, _product.name, _quantity, _unit_price, _variation_id, _variation_label);

      INSERT INTO public.stock_movements (product_id, variation_id, batch_id, movement_type, quantity, reason, order_id)
      VALUES (_product_id, _variation_id, NULL, 'saida', _quantity, 'Baixa por criação de pedido', _order_id);
    ELSE
      INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
      VALUES (_order_id, _product_id, _product.name, _quantity, _product.price);

      PERFORM public.deduct_stock_fefo(_product_id, _quantity, _order_id);
    END IF;
  END LOOP;

  RETURN QUERY SELECT _order_id, _order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(text, text, text, jsonb, text) TO anon, authenticated;

-- Habilita Realtime pra variações também, pra refletir estoque na hora.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_variations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variations;
  END IF;
END $$;

-- restock_from_order agora também devolve pra variação certa quando aplicável
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
  _movement RECORD;
BEGIN
  FOR _movement IN
    SELECT variation_id, SUM(quantity) AS qty
    FROM public.stock_movements
    WHERE product_id = _product_id AND order_id = _order_id AND movement_type = 'saida'
    GROUP BY variation_id
  LOOP
    IF _movement.variation_id IS NOT NULL THEN
      UPDATE public.product_variations SET stock_quantity = stock_quantity + _movement.qty WHERE id = _movement.variation_id;
    ELSE
      UPDATE public.products SET stock_quantity = stock_quantity + _movement.qty WHERE id = _product_id;
    END IF;

    INSERT INTO public.stock_movements (product_id, variation_id, batch_id, movement_type, quantity, reason, order_id)
    VALUES (_product_id, _movement.variation_id, NULL, 'devolucao', _movement.qty, 'Devolução por cancelamento de pedido', _order_id);
  END LOOP;
END;
$$;
