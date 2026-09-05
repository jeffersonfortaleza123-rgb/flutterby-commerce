import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useProductBatches, useSaveBatch, useDeleteBatch, type BatchFormInput } from "@/hooks/useBatches";
import { getExpiryStatus, EXPIRY_STATUS_META } from "@/lib/expiry";

const emptyForm = (productId: string): BatchFormInput => ({
  product_id: productId,
  batch_number: "",
  quantity: 0,
  entry_date: new Date().toISOString().slice(0, 10),
  expiry_date: "",
  supplier: "",
  cost: 0,
});

const AdminBatches = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [form, setForm] = useState<BatchFormInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ["admin-products-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").order("name");
      if (error) throw error;
      return data as Pick<Tables<"products">, "id" | "name">[];
    },
  });

  const { data: batches, isLoading } = useProductBatches(selectedProductId || undefined);
  const saveMutation = useSaveBatch();
  const deleteMutation = useDeleteBatch();

  const totalAvailable = useMemo(() => {
    if (!batches) return 0;
    return batches
      .filter((b) => getExpiryStatus(b.expiry_date) !== "vencido")
      .reduce((sum, b) => sum + b.quantity, 0);
  }, [batches]);

  const openCreate = () => {
    if (!selectedProductId) {
      toast.error("Selecione um produto primeiro");
      return;
    }
    setForm(emptyForm(selectedProductId));
    setEditingId(null);
  };

  const openEdit = (batch: Tables<"product_batches">) => {
    setForm({
      id: batch.id,
      product_id: batch.product_id,
      batch_number: batch.batch_number,
      quantity: batch.quantity,
      entry_date: batch.entry_date,
      expiry_date: batch.expiry_date,
      supplier: batch.supplier,
      cost: batch.cost,
    });
    setEditingId(batch.id);
  };

  const closeForm = () => {
    setForm(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.batch_number.trim() || !form.expiry_date) {
      toast.error("Preencha o número do lote e a validade");
      return;
    }
    try {
      await saveMutation.mutateAsync(form);
      toast.success(editingId ? "Lote atualizado!" : "Lote cadastrado!");
      closeForm();
    } catch {
      toast.error("Erro ao salvar o lote");
    }
  };

  const handleDelete = async (batch: Tables<"product_batches">) => {
    if (!confirm(`Remover o lote "${batch.batch_number}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteMutation.mutateAsync(batch);
      toast.success("Lote removido!");
    } catch {
      toast.error("Erro ao remover o lote");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold font-heading">Estoque e Lotes</h1>
        <button
          onClick={openCreate}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm w-fit"
        >
          <Plus className="h-4 w-4" /> Novo Lote
        </button>
      </div>

      <div className="bg-background rounded-xl border p-4">
        <label className="text-sm font-medium">Selecione um produto</label>
        <select
          value={selectedProductId}
          onChange={(e) => { setSelectedProductId(e.target.value); closeForm(); }}
          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Selecione...</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {selectedProductId && (
          <p className="text-sm text-muted-foreground mt-2">
            Estoque disponível (lotes não vencidos): <span className="font-semibold text-foreground">{totalAvailable}</span> unidades
          </p>
        )}
      </div>

      {form && (
        <div className="bg-background rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2"><PackagePlus className="h-4 w-4" /> {editingId ? "Editar Lote" : "Novo Lote"}</h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Número do lote *</label>
              <input
                value={form.batch_number}
                onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: L2026-001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Quantidade *</label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de entrada *</label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de validade *</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fornecedor</label>
              <input
                value={form.supplier || ""}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.cost ?? 0}
                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Cancelar</button>
              <button type="submit" disabled={saveMutation.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedProductId && (
        isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-background rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Lote</th>
                    <th className="text-left px-4 py-3 font-medium">Quantidade</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Validade</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fornecedor</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches?.map((b) => {
                    const status = getExpiryStatus(b.expiry_date);
                    const meta = EXPIRY_STATUS_META[status];
                    return (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{b.batch_number}</td>
                        <td className="px-4 py-3">{b.quantity}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">{new Date(b.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{b.supplier || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${meta.className}`}>{meta.emoji} {meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(b)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!batches?.length && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum lote cadastrado para este produto</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default AdminBatches;
