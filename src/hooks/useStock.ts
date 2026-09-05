import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Estoque disponível (soma dos lotes não vencidos) de um único produto. */
export const useAvailableStock = (productId?: string) => {
  return useQuery({
    queryKey: ["available-stock", productId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_stock", {
        _product_id: productId!,
      });
      if (error) throw error;
      return data as number;
    },
    enabled: !!productId,
  });
};

/**
 * Estoque disponível de vários produtos de uma vez (usado na listagem
 * pública da loja, pra evitar uma chamada por produto).
 * Retorna um mapa { [product_id]: quantidade_disponivel }.
 */
export const useStockMap = (productIds: string[]) => {
  return useQuery({
    queryKey: ["stock-map", [...productIds].sort()],
    queryFn: async () => {
      if (productIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase.rpc("get_available_stock_map", {
        _product_ids: productIds,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      data?.forEach((row) => { map[row.product_id] = row.available; });
      return map;
    },
    enabled: productIds.length > 0,
  });
};
