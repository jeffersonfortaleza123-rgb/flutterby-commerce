import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, X, ImageIcon, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/errors";
import { compressImage } from "@/lib/imageCompression";
import { getExpiryStatus, EXPIRY_STATUS_META, type ExpiryStatus } from "@/lib/expiry";
import { PRODUCT_TYPE_OPTIONS, type ProductType } from "@/lib/productTypes";
import VariationsManager from "@/components/admin/VariationsManager";

type ProductRow = Tables<"products"> & { categories?: { name: string } | null };

const emptyForm = {
  name: "",
  description: "",
  price: "",
  brand: "",
  sku: "",
  barcode: "",
  supplier: "",
  product_type: "outros" as ProductType,
  image_url: "",
  category_id: "",
  active: true,
  hasExpiry: false,
  expiry_date: "",
  batch_label: "",
  min_stock: "5",
  stockInput: "0",
  hasVariations: false,
};

const STOCK_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "baixo", label: "Estoque baixo" },
  { value: "sem", label: "Sem estoque" },
  { value: "proximo", label: "Próx. validade" },
  { value: "vencido", label: "Vencido" },
] as const;

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "todos">("todos");
  const [stockFilter, setStockFilter] = useState<(typeof STOCK_FILTERS)[number]["value"]>("todos");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
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

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !term
        || p.name.toLowerCase().includes(term)
        || p.brand?.toLowerCase().includes(term)
        || p.sku?.toLowerCase().includes(term)
        || p.barcode?.toLowerCase().includes(term);
      const matchesType = typeFilter === "todos" || p.product_type === typeFilter;
      const status: ExpiryStatus | null = p.expiry_date ? getExpiryStatus(p.expiry_date) : null;
      const matchesStock =
        stockFilter === "todos" ? true :
        stockFilter === "baixo" ? (p.stock_quantity > 0 && p.stock_quantity <= p.min_stock) :
        stockFilter === "sem" ? p.stock_quantity === 0 :
        stockFilter === "proximo" ? (status === "proximo" || status === "vencendo") :
        stockFilter === "vencido" ? status === "vencido" : true;
      return matchesSearch && matchesType && matchesStock;
    });
  }, [products, search, typeFilter, stockFilter]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string; currentStock: number }) => {
      const delta = parseInt(data.stockInput) || 0;
      const newStock = data.currentStock + delta;
      if (!data.hasVariations && newStock < 0) {
        throw new Error(`Estoque não pode ficar negativo (atual: ${data.currentStock}, ajuste: ${delta})`);
      }

      const payload = {
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price) || 0,
        brand: data.brand || null,
        sku: data.sku.trim() || null,
        barcode: data.barcode || null,
        supplier: data.supplier || null,
        product_type: data.product_type,
        image_url: data.image_url || null,
        category_id: data.category_id || null,
        active: data.active,
        expiry_date: data.hasExpiry && data.expiry_date ? data.expiry_date : null,
        batch_label: data.hasExpiry ? (data.batch_label || null) : null,
        min_stock: parseInt(data.min_stock) || 5,
        // Se o produto tem variações, o estoque é a soma delas (gatilho no banco cuida disso).
        // Aqui só definimos o estoque quando NÃO tem variação.
        ...(data.hasVariations ? {} : { stock_quantity: newStock }),
      };

      if (data.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", data.id);
        if (error) throw error;

        if (!data.hasVariations && delta !== 0) {
          await supabase.from("stock_movements").insert({
            product_id: data.id,
            batch_id: null,
            movement_type: delta > 0 ? "entrada" : "ajuste",
            quantity: delta,
            reason: "Ajuste manual no cadastro do produto",
          });
        }
        return data.id;
      } else {
        const { data: created, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;

        if (!data.hasVariations && newStock > 0) {
          await supabase.from("stock_movements").insert({
            product_id: created.id,
            batch_id: null,
            movement_type: "entrada",
            quantity: newStock,
            reason: "Estoque inicial no cadastro do produto",
          });
        }
        return created.id;
      }
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-map"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(editing ? "Produto atualizado!" : "Produto criado!");
      if (!editing) {
        // Produto novo: mantém aberto pra já poder cadastrar variações, se for o caso.
        openEditById(id);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err, "Erro ao salvar produto. Verifique se o SKU/código de barras já não está em uso.")),
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

  const openEdit = (p: ProductRow) => {
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      brand: p.brand || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      supplier: p.supplier || "",
      product_type: p.product_type,
      image_url: p.image_url || "",
      category_id: p.category_id || "",
      active: p.active,
      hasExpiry: !!p.expiry_date,
      expiry_date: p.expiry_date || "",
      batch_label: p.batch_label || "",
      min_stock: String(p.min_stock),
      stockInput: "0",
      hasVariations: form.hasVariations, // preservado se já estava marcado nesta sessão
    });
    setImagePreview(p.image_url || null);
    setEditing(p);
    setCreating(false);
  };

  const openEditById = (id: string) => {
    const p = products?.find((pr) => pr.id === id);
    if (p) openEdit({ ...p, categories: p.categories });
    else queryClient.invalidateQueries({ queryKey: ["admin-products"] }).then(() => {
      const found = queryClient.getQueryData<ProductRow[]>(["admin-products"])?.find((pr) => pr.id === id);
      if (found) openEdit(found);
    });
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
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    let uploadBlob: Blob = file;
    try {
      uploadBlob = await compressImage(file);
    } catch {
      // Se a compressão falhar por algum motivo, envia o arquivo original mesmo
    }

    const { error } = await supabase.storage.from("store-images").upload(fileName, uploadBlob, { contentType: "image/jpeg" });
    if (error) {
      toast.error(getErrorMessage(error, "Erro ao enviar imagem"));
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
    if (!form.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    saveMutation.mutate({ ...form, id: editing?.id, currentStock: editing?.stock_quantity || 0 });
  };

  const handleDelete = (p: ProductRow) => {
    if (!confirm(`Remover o produto "${p.name}"? Essa ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(p.id);
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
          Você ainda não tem categorias cadastradas. Crie categorias em <span className="font-medium">Categorias</span> no menu.
        </div>
      )}

      {showForm && (
        <div className="bg-background rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{editing ? "Editar Produto" : "Novo Produto"}</h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de produto */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de produto *</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TYPE_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setForm({ ...form, product_type: opt.value })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.product_type === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="text-sm font-medium">Categoria (loja)</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Sem categoria</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">SKU / código interno</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Opcional, deve ser único" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium">Código de barras</label>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Opcional" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium">Fornecedor</label>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Opcional" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>

            {/* Imagem */}
            <div>
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

            {/* Variações */}
            <div className="border rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.hasVariations}
                  onChange={(e) => setForm({ ...form, hasVariations: e.target.checked })}
                  className="rounded"
                />
                Este produto tem variações (tamanho, cor, numeração...)?
              </label>
              {form.hasVariations && (
                editing ? (
                  <VariationsManager productId={editing.id} productType={form.product_type} defaultPrice={parseFloat(form.price) || 0} />
                ) : (
                  <p className="text-xs text-muted-foreground">Salve o produto primeiro pra poder cadastrar as variações.</p>
                )
              )}
            </div>

            {/* Estoque (só quando não tem variações — com variações, o total vem delas) */}
            {!form.hasVariations && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4 border">
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
                    {editing ? "Positivo para adicionar, negativo para remover. Soma ao estoque atual." : "Quantidade inicial em estoque."}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estoque mínimo (alerta)</label>
                  <input type="number" min={0} value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                {editing && form.stockInput && parseInt(form.stockInput) !== 0 && (
                  <div className="text-sm sm:col-span-2">
                    Novo estoque: <span className="font-semibold">{editing.stock_quantity + (parseInt(form.stockInput) || 0)}</span> unidade(s)
                  </div>
                )}
              </div>
            )}

            {/* Validade */}
            <div className="border rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.hasExpiry}
                  onChange={(e) => setForm({ ...form, hasExpiry: e.target.checked })}
                  className="rounded"
                />
                Este produto possui validade?
              </label>
              {form.hasExpiry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Data de validade *</label>
                    <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Lote</label>
                    <input value={form.batch_label} onChange={(e) => setForm({ ...form, batch_label: e.target.value })} placeholder="Opcional" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} id="active" className="rounded" />
              <label htmlFor="active" className="text-sm">Ativo (visível na loja)</label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Fechar</button>
              <button type="submit" disabled={saveMutation.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, marca, SKU ou código de barras..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ProductType | "todos")} className="px-3 py-2 border rounded-lg text-sm bg-background">
          <option value="todos">Todos os tipos</option>
          {PRODUCT_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {STOCK_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStockFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              stockFilter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Produto</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Preço</th>
                  <th className="text-left px-4 py-3 font-medium">Estoque</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Validade</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((p) => {
                  const expiryStatus = p.expiry_date ? getExpiryStatus(p.expiry_date) : null;
                  const expiryMeta = expiryStatus ? EXPIRY_STATUS_META[expiryStatus] : null;
                  const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.brand || "—"} · {p.categories?.name || "sem categoria"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.sku || "—"}</td>
                      <td className="px-4 py-3 font-semibold">R$ {p.price.toFixed(2).replace(".", ",")}</td>
                      <td className="px-4 py-3">
                        <span className={p.stock_quantity === 0 ? "text-destructive font-medium" : isLow ? "text-yellow-600 font-medium" : ""}>{p.stock_quantity}</span>
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
                          <button onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredProducts.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto encontrado para esse filtro</td></tr>
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
