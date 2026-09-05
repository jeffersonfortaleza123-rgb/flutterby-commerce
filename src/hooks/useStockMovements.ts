import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStockMovements = (productId?: string) => {
  return useQuery({
    queryKey: ["admin-stock-movements", productId],
    queryFn: async () => {
      let query = supabase
        .from("stock_movements")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (productId) query = query.eq("product_id", productId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
