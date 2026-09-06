import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Variation = Tables<"product_variations">;

/** Variações de um produto — usado tanto no admin quanto na loja (público, via RLS). */
export const useProductVariations = (productId?: string) => {
  return useQuery({
    queryKey: ["product-variations", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
};

export interface VariationInput {
  id?: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  attributes: Record<string, string>;
  stock_quantity: number;
  price: number | null;
}

export const useSaveVariation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VariationInput) => {
      if (input.id) {
        const { error } = await supabase
          .from("product_variations")
          .update({
            sku: input.sku,
            barcode: input.barcode,
            attributes: input.attributes,
            stock_quantity: input.stock_quantity,
            price: input.price,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_variations").insert({
          product_id: input.product_id,
          sku: input.sku,
          barcode: input.barcode,
          attributes: input.attributes,
          stock_quantity: input.stock_quantity,
          price: input.price,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-variations", variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
  });
};

export const useDeleteVariation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variation: Pick<Variation, "id" | "product_id">) => {
      const { error } = await supabase.from("product_variations").delete().eq("id", variation.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-variations", variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
  });
};
