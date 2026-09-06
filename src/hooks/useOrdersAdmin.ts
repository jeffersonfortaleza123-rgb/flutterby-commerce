import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "novo",
  "confirmado",
  "preparacao",
  "enviado",
  "entregue",
];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-blue-100 text-blue-700" },
  confirmado: { label: "Confirmado", className: "bg-purple-100 text-purple-700" },
  preparacao: { label: "Em preparação", className: "bg-amber-100 text-amber-700" },
  enviado: { label: "Enviado", className: "bg-indigo-100 text-indigo-700" },
  entregue: { label: "Entregue", className: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", className: "bg-gray-200 text-gray-700" },
};

/**
 * Quais status fazem sentido escolher a partir do status atual.
 * Só permite avançar UM passo de cada vez (ou cancelar), porque a baixa
 * automática de estoque só é disparada na transição exata novo -> confirmado,
 * e a devolução só na transição confirmado/preparacao/enviado -> cancelado.
 * Pular etapas pelo seletor quebraria essa lógica.
 */
export const getNextStatusOptions = (current: OrderStatus): OrderStatus[] => {
  if (current === "cancelado" || current === "entregue") return [current];
  const idx = ORDER_STATUS_FLOW.indexOf(current);
  const options: OrderStatus[] = [current];
  if (idx < ORDER_STATUS_FLOW.length - 1) options.push(ORDER_STATUS_FLOW[idx + 1]);
  options.push("cancelado");
  return options;
};

/** Lista de pedidos, com dados do cliente e total de itens. */
export const useAdminOrders = (statusFilter?: OrderStatus) => {
  return useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, customers(name, phone, address), order_items(id, quantity, product_name, unit_price)")
        .order("created_at", { ascending: false });
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
    },
  });
};
