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
