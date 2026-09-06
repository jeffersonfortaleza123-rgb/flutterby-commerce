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
      const [productsRes, batchesRes, ordersRes] = await Promise.all([
        supabase.from("products").select("id").eq("active", true),
        supabase.from("product_batches").select("product_id, quantity, expiry_date"),
        supabase.from("orders").select("status"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (batchesRes.error) throw batchesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const products = productsRes.data;
      const batches = batchesRes.data;
      const orders = ordersRes.data;

      // Soma o estoque disponível (lotes não vencidos) por produto
      const stockByProduct = new Map<string, number>();
      let nearExpiry = 0;
      let expired = 0;

      for (const batch of batches) {
        if (batch.quantity <= 0) continue;
        const status = getExpiryStatus(batch.expiry_date);
        if (status === "vencido") {
          expired++;
        } else {
          if (status === "proximo" || status === "vencendo") nearExpiry++;
          stockByProduct.set(batch.product_id, (stockByProduct.get(batch.product_id) || 0) + batch.quantity);
        }
      }

      let lowStock = 0;
      let outOfStock = 0;
      for (const product of products) {
        const available = stockByProduct.get(product.id) || 0;
        if (available === 0) outOfStock++;
        else if (available <= LOW_STOCK_THRESHOLD) lowStock++;
      }

      const newOrders = orders.filter((o) => o.status === "novo").length;
      const inProgressOrders = orders.filter((o) => ["confirmado", "preparacao", "enviado"].includes(o.status)).length;

      return {
        totalProducts: products.length,
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
