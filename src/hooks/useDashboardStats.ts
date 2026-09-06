import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getExpiryStatus } from "@/lib/expiry";

export const LOW_STOCK_THRESHOLD = 5;

export interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  nearExpiry: number; // status "proximo" ou "vencendo"
  expired: number; // status "vencido"
  newOrders: number;
  inProgressOrders: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from("products").select("id, active, stock_quantity, expiry_date"),
        supabase.from("orders").select("status"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const products = productsRes.data;
      const orders = ordersRes.data;
      const activeProducts = products.filter((p) => p.active);

      let lowStock = 0;
      let outOfStock = 0;
      let nearExpiry = 0;
      let expired = 0;

      for (const product of activeProducts) {
        if (product.stock_quantity === 0) outOfStock++;
        else if (product.stock_quantity <= LOW_STOCK_THRESHOLD) lowStock++;

        if (product.expiry_date) {
          const status = getExpiryStatus(product.expiry_date);
          if (status === "vencido") expired++;
          else if (status === "proximo" || status === "vencendo") nearExpiry++;
        }
      }

      const newOrders = orders.filter((o) => o.status === "novo").length;
      const inProgressOrders = orders.filter((o) => ["confirmado", "preparacao", "enviado"].includes(o.status)).length;

      return {
        totalProducts: activeProducts.length,
        lowStock,
        outOfStock,
        nearExpiry,
        expired,
        newOrders,
        inProgressOrders,
      };
    },
  });
};
