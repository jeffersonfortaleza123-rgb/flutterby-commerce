import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface CreateOrderItem {
  product_id: string;
  quantity: number;
  variation_id?: string | null;
}

export interface CreateOrderInput {
  name: string;
  phone: string;
  address: string;
  items: CreateOrderItem[];
  notes?: string;
  deliveryMethod: "entrega" | "retirada";
}

export interface CreateOrderResult {
  order_id: string;
  order_number: number;
}

/**
 * Cria o pedido inteiro (cliente + pedido + itens) numa única chamada
 * atômica no banco. A validação de estoque e o cálculo do total
 * acontecem no servidor — nunca confiamos em valores vindos do navegador.
 */
export const useCreateOrder = () => {
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<CreateOrderResult> => {
      const { data, error } = await supabase.rpc("create_order_with_items", {
        _customer_name: input.name,
        _customer_phone: input.phone,
        _customer_address: input.address,
        _items: input.items as unknown as Json,
        _notes: input.notes,
        _delivery_method: input.deliveryMethod,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) throw new Error("Não foi possível criar o pedido");

      return result;
    },
  });
};
