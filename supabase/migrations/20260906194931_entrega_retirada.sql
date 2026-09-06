-- =========================================================
-- Localizacao da loja (endereco + link do Google Maps) e opcao
-- de entrega ou retirada no checkout.
-- =========================================================

INSERT INTO public.site_settings (key, value) VALUES
  ('store_address', ''),
  ('store_maps_link', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'entrega'
  CHECK (delivery_method IN ('entrega', 'retirada'));

-- A versão antiga (sem _delivery_method) tinha 5 parâmetros; como
-- estamos adicionando um 6º, o Postgres trataria como função nova
-- em vez de substituir. Removemos a antiga pra não ficar duplicado.
DROP FUNCTION IF EXISTS public.create_order_with_items(text, text, text, jsonb, text);

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _customer_name TEXT,
  _customer_phone TEXT,
  _customer_address TEXT,
  _items JSONB,
  _notes TEXT DEFAULT NULL,
  _delivery_method TEXT DEFAULT 'entrega'
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
    RAISE EXCEPTION 'Order has no items';
  END IF;
  IF _customer_name IS NULL OR trim(_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF _customer_phone IS NULL OR trim(_customer_phone) = '' THEN
    RAISE EXCEPTION 'Customer phone is required';
  END IF;
  IF _delivery_method NOT IN ('entrega', 'retirada') THEN
    _delivery_method := 'entrega';
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _product_id := (_item->>'product_id')::UUID;
    _variation_id := NULLIF(_item->>'variation_id', '')::UUID;
    _quantity := (_item->>'quantity')::INT;

    IF _quantity IS NULL OR _quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for one of the items';
    END IF;

    SELECT * INTO _product FROM public.products WHERE id = _product_id AND active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or unavailable';
    END IF;

    IF _variation_id IS NOT NULL THEN
      SELECT * INTO _variation FROM public.product_variations WHERE id = _variation_id AND product_id = _product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variation not found for product %', _product.name;
      END IF;
      IF _variation.stock_quantity < _quantity THEN
        RAISE EXCEPTION 'Not enough stock for %: available %, requested %', _product.name, _variation.stock_quantity, _quantity;
      END IF;
      _total := _total + COALESCE(_variation.price, _product.price) * _quantity;
    ELSE
      _available := public.get_available_stock(_product_id);
      IF _available < _quantity THEN
        RAISE EXCEPTION 'Not enough stock for %: available %, requested %', _product.name, _available, _quantity;
      END IF;
      _total := _total + (_product.price * _quantity);
    END IF;
  END LOOP;

  INSERT INTO public.customers (name, phone, address)
  VALUES (trim(_customer_name), trim(_customer_phone), NULLIF(trim(_customer_address), ''))
  RETURNING id INTO _customer_id;

  INSERT INTO public.orders (customer_id, total, notes, delivery_method)
  VALUES (_customer_id, _total, _notes, _delivery_method)
  RETURNING id, orders.order_number INTO _order_id, _order_number;

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
        RAISE EXCEPTION 'Not enough stock for %', _product.name;
      END IF;

      INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, variation_id, variation_label)
      VALUES (_order_id, _product_id, _product.name, _quantity, _unit_price, _variation_id, _variation_label);

      INSERT INTO public.stock_movements (product_id, variation_id, batch_id, movement_type, quantity, reason, order_id)
      VALUES (_product_id, _variation_id, NULL, 'saida', _quantity, 'Baixa por criacao de pedido', _order_id);
    ELSE
      INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
      VALUES (_order_id, _product_id, _product.name, _quantity, _product.price);

      PERFORM public.deduct_stock_fefo(_product_id, _quantity, _order_id);
    END IF;
  END LOOP;

  RETURN QUERY SELECT _order_id, _order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(text, text, text, jsonb, text, text) TO anon, authenticated;
