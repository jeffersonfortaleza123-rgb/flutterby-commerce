import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tables<"categories"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", image_url: "", display_order: "0" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { name: data.name, image_url: data.image_url || null, display_order: parseInt(data.display_order) || 0 };
      if (data.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria salva!");
      closeForm();
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida!");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const openCreate = () => { setForm({ name: "", image_url: "", display_order: "0" }); setCreating(true); setEditing(null); };
  const openEdit = (c: Tables<"categories">) => { setForm({ name: c.name, image_url: c.image_url || "", display_order: String(c.display_order) }); setEditing(c); setCreating(false); };
  const closeForm = () => { setEditing(null); setCreating(false); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Categorias</h1>
        <button onClick={openCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm">
          <Plus className="h-4 w-4" /> Nova Categoria
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-background rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{editing ? "Editar Categoria" : "Nova Categoria"}</h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Ordem</label>
              <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Cancelar</button>
              <button type="submit" disabled={saveMutation.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-background rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Ordem</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories?.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.display_order}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!categories?.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Nenhuma categoria</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
