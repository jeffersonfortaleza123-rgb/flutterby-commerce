import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const AdminBanners = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tables<"banners"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ image_url: "", link: "", display_order: "0", active: true });

  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { image_url: data.image_url, link: data.link || null, display_order: parseInt(data.display_order) || 0, active: data.active };
      if (data.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner salvo!");
      closeForm();
    },
    onError: () => toast.error("Erro ao salvar banner"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner removido!");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const openCreate = () => { setForm({ image_url: "", link: "", display_order: "0", active: true }); setCreating(true); setEditing(null); };
  const openEdit = (b: Tables<"banners">) => { setForm({ image_url: b.image_url, link: b.link || "", display_order: String(b.display_order), active: b.active }); setEditing(b); setCreating(false); };
  const closeForm = () => { setEditing(null); setCreating(false); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Banners</h1>
        <button onClick={openCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm">
          <Plus className="h-4 w-4" /> Novo Banner
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-background rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{editing ? "Editar Banner" : "Novo Banner"}</h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">URL da Imagem *</label>
              <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} required className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Link (opcional)</label>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Ordem</label>
              <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} id="banner-active" className="rounded" />
              <label htmlFor="banner-active" className="text-sm">Ativo</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banners?.map((b) => (
            <div key={b.id} className="bg-background rounded-xl border overflow-hidden">
              <img src={b.image_url} alt="Banner" className="w-full h-40 object-cover" />
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${b.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {b.active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">Ordem: {b.display_order}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteMutation.mutate(b.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
          {!banners?.length && <p className="text-muted-foreground col-span-2 text-center py-8">Nenhum banner cadastrado</p>}
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
