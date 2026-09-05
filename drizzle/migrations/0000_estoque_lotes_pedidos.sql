-- =========================================================
-- FASE 1: Estoque por lote, validade (FEFO), clientes e pedidos
-- =========================================================

CREATE TABLE public.product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  supplier TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_batches TO authenticated;
GRANT ALL ON public.product_batches TO service_role;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage batches" ON public.product_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_batches_updated_at
  BEFORE UPDATE ON public.product_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_batches_product_id ON public.product_batches(product_id);
CREATE INDEX idx_product_batches_expiry_date ON public.product_batches(expiry_date);

CREATE TYPE public.expiry_status AS ENUM ('normal', 'proximo', 'vencendo', 'vencido');

CREATE OR REPLACE FUNCTION public.get_expiry_status(_expiry_date DATE)
RETURNS public.expiry_status
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN _expiry_date < CURRENT_DATE THEN 'vencido'::public.expiry_status
    WHEN _expiry_date < CURRENT_DATE + INTERVAL '1 month' THEN 'vencendo'::public.expiry_status
    WHEN _expiry_date < CURRENT_DATE + INTERVAL '3 months' THEN 'proximo'::public.expiry_status
    ELSE 'normal'::public.expiry_status
  END
$$;

CREATE OR REPLACE FUNCTION public.get_available_stock(_product_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(quantity), 0)::INT
  FROM public.product_batches
  WHERE product_id = _product_id
    AND expiry_date >= CURRENT_DATE
$$;

CREATE TYPE public.stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste', 'devolucao');

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  movement_type public.stock_movement_type NOT NULL,
  quantity INT NOT NULL,
  reason TEXT,
  order_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a customer record" ON public.customers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all customers" ON public.customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.order_status AS ENUM (
  'novo', 'confirmado', 'preparacao', 'enviado', 'entregue', 'cancelado'
);

CREATE SEQUENCE public.order_number_seq START 1;
GRANT USAGE ON SEQUENCE public.order_number_seq TO anon, authenticated;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number INT NOT NULL DEFAULT nextval('public.order_number_seq') UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'novo',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create an order" ON public.orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_orders_status ON public.orders(status);

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

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
DECLARE
  _remaining INT := _quantity;
  _batch RECORD;
  _take INT;
BEGIN
  FOR _batch IN
    SELECT id, quantity
    FROM public.product_batches
    WHERE product_id = _product_id
      AND expiry_date >= CURRENT_DATE
      AND quantity > 0
    ORDER BY expiry_date ASC
    FOR UPDATE
  LOOP
    EXIT WHEN _remaining <= 0;
    _take := LEAST(_batch.quantity, _remaining);

    UPDATE public.product_batches
    SET quantity = quantity - _take
    WHERE id = _batch.id;

    INSERT INTO public.stock_movements (product_id, batch_id, movement_type, quantity, reason, order_id)
    VALUES (_product_id, _batch.id, 'saida', _take, 'Baixa por confirmação de pedido', _order_id);

    _remaining := _remaining - _take;
  END LOOP;

  IF _remaining > 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para o produto %', _product_id;
  END IF;
END;
$$;

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
    SELECT id, batch_id, quantity
    FROM public.stock_movements
    WHERE product_id = _product_id
      AND order_id = _order_id
      AND movement_type = 'saida'
  LOOP
    IF _movement.batch_id IS NOT NULL THEN
      UPDATE public.product_batches
      SET quantity = quantity + _movement.quantity
      WHERE id = _movement.batch_id;
    END IF;

    INSERT INTO public.stock_movements (product_id, batch_id, movement_type, quantity, reason, order_id)
    VALUES (_product_id, _movement.batch_id, 'devolucao', _movement.quantity, 'Devolução por cancelamento de pedido', _order_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
BEGIN
  IF NEW.status = 'confirmado' AND OLD.status = 'novo' THEN
    FOR _item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      PERFORM public.deduct_stock_fefo(_item.product_id, _item.quantity, NEW.id);
    END LOOP;
  END IF;

  IF NEW.status = 'cancelado' AND OLD.status IN ('confirmado', 'preparacao', 'enviado') THEN
    FOR _item IN SELECT DISTINCT product_id FROM public.order_items WHERE order_id = NEW.id LOOP
      PERFORM public.restock_from_order(_item.product_id, NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_order_status_change();