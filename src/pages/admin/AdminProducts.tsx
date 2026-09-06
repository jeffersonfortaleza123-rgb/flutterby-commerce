import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/errors";
import { getExpiryStatus, EXPIRY_STATUS_META } from "@/lib/expiry";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  brand: "",
  barcode: "",
  image_url: "",
  category_id: "",
  active: true,
  expiry_date: "",
  stockInput: "0",
};

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tables<"products"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string; currentStock: number }) => {
      const delta = parseInt(data.stockInput) || 0;
      const newStock = data.currentStock + delta;
      if (newStock < 0) {
        throw new Error(`Estoque não pode ficar negativo (atual: ${data.currentStock}, ajuste: ${delta})`);
      }

      const payload = {
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price) || 0,
        brand: data.brand || null,
        barcode: data.barcode || null,
        image_url: data.image_url || null,
        category_id: data.category_id || null,
        active: data.active,
        expiry_date: data.expiry_date || null,
        stock_quantity: newStock,
      };

      if (data.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", data.id);
        if (error) throw error;

        if (delta !== 0) {
          await supabase.from("stock_movements").insert({
            product_id: data.id,
            batch_id: null,
            movement_type: delta > 0 ? "entrada" : "ajuste",
            quantity: delta,
            reason: "Ajuste manual no cadastro do produto",
          });
        }
      } else {
        const { data: created, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;

        if (newStock > 0) {
          await supabase.from("stock_movements").insert({
            product_id: created.id,
            batch_id: null,
            movement_type: "entrada",
            quantity: newStock,
            reason: "Estoque inicial no cadastro do produto",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(editing ? "Produto atualizado!" : "Produto criado!");
      closeForm();
    },
    onError: (err) => toast.error(getErrorMessage(err, "Erro ao salvar produto")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido!");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setImagePreview(null);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (p: Tables<"products">) => {
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      brand: p.brand || "",
      barcode: p.barcode || "",
      image_url: p.image_url || "",
      category_id: p.category_id || "",
      active: p.active,
      expiry_date: p.expiry_date || "",
      stockInput: "0",
    });
    setImagePreview(p.image_url || null);
    setEditing(p);
    setCreating(false);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("store-images").upload(fileName, file);
    if (error) {
      toast.error("Erro ao enviar imagem");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(fileName);
    setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    setImagePreview(urlData.publicUrl);
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, id: editing?.id, currentStock: editing?.stock_quantity || 0 });
  };

  const showForm = creating || editing;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Produtos</h1>
        <button onClick={openCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm">
          <Plus className="h-4 w-4" /> Novo Produto
        </button>
      </div>

      {!categories?.length && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3">
          Você ainda não tem categorias cadastradas. Crie categorias em <span className="font-medium">Categorias</span> no menu para poder organizar seus produtos.
        </div>
      )}

      {showForm && (
        <div className="bg-background rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{editing ? "Editar Produto" : "Novo Produto"}</h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Marca</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Preço *</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Código de barras</label>
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Opcional" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Sem categoria</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Validade</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} placeholder="Opcional" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4 border">
              {editing && (
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  Estoque atual: <span className="font-semibold text-foreground">{editing.stock_quantity}</span> unidade(s)
                </div>
              )}
              <div>
                <label className="text-sm font-medium">
                  {editing ? "Adicionar / remover estoque" : "Estoque inicial"}
                </label>
                <input
                  type="number"
                  value={form.stockInput}
                  onChange={(e) => setForm({ ...form, stockInput: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editing
                    ? "Use um número positivo para adicionar ou negativo para remover. Será somado ao estoque atual."
                    : "Quantidade com que o produto entra no estoque."}
                </p>
              </div>
              {editing && form.stockInput && parseInt(form.stockInput) !== 0 && (
                <div className="text-sm self-end pb-2">
                  Novo estoque: <span className="font-semibold">{editing.stock_quantity + (parseInt(form.stockInput) || 0)}</span> unidade(s)
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Imagem do Produto</label>
              <div className="mt-1 flex items-start gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors overflow-hidden"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Clique para enviar</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">Envie uma imagem do seu computador ou cole uma URL abaixo.</p>
                  <input value={form.image_url} onChange={(e) => { setForm({ ...form, image_url: e.target.value }); setImagePreview(e.target.value || null); }} className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://..." />
                  {imagePreview && (
                    <button type="button" onClick={() => { setForm({ ...form, image_url: "" }); setImagePreview(null); }} className="text-xs text-destructive hover:underline">Remover imagem</button>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} id="active" className="rounded" />
              <label htmlFor="active" className="text-sm">Ativo</label>
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

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Produto</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium">Preço</th>
                  <th className="text-left px-4 py-3 font-medium">Estoque</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Validade</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products?.map((p) => {
                  const expiryStatus = p.expiry_date ? getExpiryStatus(p.expiry_date) : null;
                  const expiryMeta = expiryStatus ? EXPIRY_STATUS_META[expiryStatus] : null;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                            {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.categories?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold">R$ {p.price.toFixed(2).replace(".", ",")}</td>
                      <td className="px-4 py-3">
                        <span className={p.stock_quantity === 0 ? "text-destructive font-medium" : ""}>{p.stock_quantity}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {p.expiry_date && expiryMeta ? (
                          <span className={`text-xs px-2 py-1 rounded-full ${expiryMeta.className}`}>
                            {expiryMeta.emoji} {new Date(p.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {p.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!products?.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto cadastrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
