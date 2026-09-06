-- =========================================================
-- FASE 5, parte 1: Reservar estoque no momento do PEDIDO,
-- não só quando o admin confirma. Isso evita vender a mesma
-- unidade duas vezes se dois clientes comprarem quase juntos.
-- =========================================================

-- create_order_with_items agora desconta o estoque (FEFO) logo após
-- criar os itens do pedido, dentro da mesma transação atômica.
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
  _quantity INT;
  _product RECORD;
  _available INT;
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

  -- 1) Validar tudo ANTES de gravar qualquer coisa
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _product_id := (_item->>'product_id')::UUID;
    _quantity := (_item->>'quantity')::INT;

    IF _quantity IS NULL OR _quantity <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para um dos itens';
    END IF;

    SELECT * INTO _product FROM public.products WHERE id = _product_id AND active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado ou indisponível';
    END IF;

    _available := public.get_available_stock(_product_id);
    IF _available < _quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %', _product.name, _available, _quantity;
    END IF;

    _total := _total + (_product.price * _quantity);
  END LOOP;

  -- 2) Criar cliente
  INSERT INTO public.customers (name, phone, address)
  VALUES (trim(_customer_name), trim(_customer_phone), NULLIF(trim(_customer_address), ''))
  RETURNING id INTO _customer_id;

  -- 3) Criar pedido
  INSERT INTO public.orders (customer_id, total, notes)
  VALUES (_customer_id, _total, _notes)
  RETURNING id, orders.order_number INTO _order_id, _order_number;

  -- 4) Criar itens e já reservar (descontar) o estoque via FEFO
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _product_id := (_item->>'product_id')::UUID;
    _quantity := (_item->>'quantity')::INT;
    SELECT * INTO _product FROM public.products WHERE id = _product_id;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (_order_id, _product_id, _product.name, _quantity, _product.price);

    PERFORM public.deduct_stock_fefo(_product_id, _quantity, _order_id);
  END LOOP;

  RETURN QUERY SELECT _order_id, _order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(text, text, text, jsonb, text) TO anon, authenticated;

-- O gatilho de mudança de status não precisa mais descontar estoque na
-- transição novo -> confirmado (isso já acontece na criação do pedido).
-- Mas a devolução ao cancelar agora vale a partir de QUALQUER status
-- não-final, já que o estoque é reservado desde o "novo".
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
BEGIN
  -- Cancelando um pedido: devolver o estoque que foi reservado na criação
  IF NEW.status = 'cancelado' AND OLD.status IN ('novo', 'confirmado', 'preparacao', 'enviado') THEN
    FOR _item IN SELECT DISTINCT product_id FROM public.order_items WHERE order_id = NEW.id LOOP
      PERFORM public.restock_from_order(_item.product_id, NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================
-- FASE 5, parte 2: Habilitar Realtime nas tabelas relevantes,
-- para que a loja e o admin recebam as mudanças instantaneamente,
-- sem precisar recarregar a página.
-- =========================================================
DO $$
DECLARE
  _table TEXT;
BEGIN
  FOREACH _table IN ARRAY ARRAY[
    'products', 'categories', 'banners', 'site_settings',
    'product_batches', 'stock_movements', 'orders', 'order_items'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = _table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _table);
    END IF;
  END LOOP;
END $$;
