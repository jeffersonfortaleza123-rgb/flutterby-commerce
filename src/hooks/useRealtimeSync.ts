import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mapa de qual(is) cache(s) do react-query invalidar quando uma tabela
 * muda no banco. As chaves usam prefixo, então invalidar ["products"]
 * também invalida ["products", categoriaId], por exemplo.
 */
const TABLE_QUERY_KEYS: Record<string, string[][]> = {
  products: [["products"], ["product"], ["admin-products-simple"], ["admin-dashboard-stats"]],
  categories: [["categories"], ["products"]],
  banners: [["banners"]],
  site_settings: [["site_settings"]],
  product_batches: [["admin-batches"], ["stock-map"], ["available-stock"], ["admin-dashboard-stats"]],
  stock_movements: [["admin-stock-movements"]],
  orders: [["admin-orders"], ["admin-dashboard-stats"]],
  order_items: [["admin-orders"]],
};

/**
 * Assina mudanças em tempo real (Supabase Realtime) nas tabelas
 * principais da loja e do admin, e invalida os caches correspondentes
 * assim que algo muda — em qualquer aba, de qualquer pessoa.
 * Monte esse hook uma única vez, perto da raiz do app.
 */
export const useRealtimeSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("realtime-sync");

    Object.entries(TABLE_QUERY_KEYS).forEach(([table, keys]) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          keys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
