import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BatchWithProduct = Tables<"product_batches"> & {
  products: { name: string; image_url: string | null; active: boolean } | null;
};

/** Todos os lotes cadastrados, com o nome do produto — usado nas telas de admin. */
export const useAllBatches = () => {
  return useQuery({
    queryKey: ["admin-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_batches")
        .select("*, products(name, image_url, active)")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data as BatchWithProduct[];
    },
  });
};

/** Lotes de um único produto — usado no formulário de cadastro de lote. */
export const useProductBatches = (productId?: string) => {
  return useQuery({
    queryKey: ["admin-batches", "product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_batches")
        .select("*")
        .eq("product_id", productId!)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
};

export interface BatchFormInput {
  id?: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  entry_date: string;
  expiry_date: string;
  supplier: string | null;
  cost: number | null;
}

export const useSaveBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BatchFormInput) => {
      if (input.id) {
        // Editando um lote existente: se a quantidade mudou, registra o ajuste
        const { data: current, error: fetchError } = await supabase
          .from("product_batches")
          .select("quantity")
          .eq("id", input.id)
          .single();
        if (fetchError) throw fetchError;

        const { error } = await supabase
          .from("product_batches")
          .update({
            batch_number: input.batch_number,
            quantity: input.quantity,
            entry_date: input.entry_date,
            expiry_date: input.expiry_date,
            supplier: input.supplier,
            cost: input.cost,
          })
          .eq("id", input.id);
        if (error) throw error;

        const delta = input.quantity - current.quantity;
        if (delta !== 0) {
          await supabase.from("stock_movements").insert({
            product_id: input.product_id,
            batch_id: input.id,
            movement_type: "ajuste",
            quantity: delta,
            reason: "Ajuste manual no cadastro do lote",
          });
        }
      } else {
        // Novo lote: entrada de estoque
        const { data: batch, error } = await supabase
          .from("product_batches")
          .insert({
            product_id: input.product_id,
            batch_number: input.batch_number,
            quantity: input.quantity,
            entry_date: input.entry_date,
            expiry_date: input.expiry_date,
            supplier: input.supplier,
            cost: input.cost,
          })
          .select()
          .single();
        if (error) throw error;

        await supabase.from("stock_movements").insert({
          product_id: input.product_id,
          batch_id: batch.id,
          movement_type: "entrada",
          quantity: input.quantity,
          reason: "Cadastro de novo lote",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
    },
  });
};

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Pick<Tables<"product_batches">, "id" | "product_id" | "quantity">) => {
      const { error } = await supabase.from("product_batches").delete().eq("id", batch.id);
      if (error) throw error;

      if (batch.quantity > 0) {
        await supabase.from("stock_movements").insert({
          product_id: batch.product_id,
          batch_id: null,
          movement_type: "ajuste",
          quantity: -batch.quantity,
          reason: "Lote removido do cadastro",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
    },
  });
};
