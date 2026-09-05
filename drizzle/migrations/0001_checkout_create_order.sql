-- =========================================================
-- FASE 2: Função para criar pedido (cliente + pedido + itens)
-- de forma atômica, validando estoque disponível antes de gravar.
-- =========================================================

-- get_available_stock precisa enxergar os lotes mesmo quando quem
-- chama é um visitante anônimo (que não tem permissão de ler
-- product_batches diretamente). SECURITY DEFINER faz a função rodar
-- com privilégio de dono, mas ela só devolve um número (soma),
-- nunca expõe os dados sensíveis do lote (custo, fornecedor, etc).
CREATE OR REPLACE FUNCTION public.get_available_stock(_product_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity), 0)::INT
  FROM public.product_batches
  WHERE product_id = _product_id
    AND expiry_date >= CURRENT_DATE
$$;

GRANT EXECUTE ON FUNCTION public.get_available_stock(uuid) TO anon, authenticated;

-- Cria o pedido inteiro em uma única operação:
--   1. valida que cada produto existe, está ativo e tem estoque suficiente
--   2. cria o registro do cliente
--   3. cria o pedido (com número sequencial e total calculado no servidor,
--      nunca confiando no preço que vem do navegador)
--   4. cria os itens do pedido
-- Se qualquer validação falhar, nada é gravado (a função inteira é
-- revertida automaticamente pelo Postgres).
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _customer_name TEXT,
  _customer_phone TEXT,
  _customer_address TEXT,
  _items JSONB, -- [{ "product_id": "uuid", "quantity": 2 }, ...]
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

  -- 4) Criar itens (com snapshot de nome e preço no momento da compra)
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _product_id := (_item->>'product_id')::UUID;
    _quantity := (_item->>'quantity')::INT;
    SELECT * INTO _product FROM public.products WHERE id = _product_id;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (_order_id, _product_id, _product.name, _quantity, _product.price);
  END LOOP;

  RETURN QUERY SELECT _order_id, _order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(text, text, text, jsonb, text) TO anon, authenticated;