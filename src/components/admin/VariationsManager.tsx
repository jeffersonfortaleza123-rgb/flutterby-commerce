import { useState } from "react";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProductVariations, useSaveVariation, useDeleteVariation, type Variation } from "@/hooks/useVariations";
import { PRODUCT_TYPE_META, formatVariationLabel, type ProductType } from "@/lib/productTypes";
import { getErrorMessage } from "@/lib/errors";

interface VariationsManagerProps {
  productId: string;
  productType: ProductType;
  defaultPrice: number;
}

const emptyAttrs = (fields: { key: string }[]): Record<string, string> => {
  const base: Record<string, string> = {};
  fields.forEach((f) => { base[f.key] = ""; });
  if (fields.length === 0) base.especificacao = "";
  return base;
};

const VariationsManager = ({ productId, productType, defaultPrice }: VariationsManagerProps) => {
  const { data: variations, isLoading } = useProductVariations(productId);
  const saveMutation = useSaveVariation();
  const deleteMutation = useDeleteVariation();

  const fields = PRODUCT_TYPE_META[productType].fields;
  const formFields = fields.length > 0 ? fields : [{ key: "especificacao", label: "Especificação" }];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [attrs, setAttrs] = useState<Record<string, string>>(emptyAttrs(formFields));
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState("0");
  const [price, setPrice] = useState("");

  const resetForm = () => {
    setAttrs(emptyAttrs(formFields));
    setSku("");
    setBarcode("");
    setStock("0");
    setPrice("");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (v: Variation) => {
    setAttrs({ ...emptyAttrs(formFields), ...(v.attributes as Record<string, string>) });
    setSku(v.sku || "");
    setBarcode(v.barcode || "");
    setStock(String(v.stock_quantity));
    setPrice(v.price != null ? String(v.price) : "");
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const hasAnyAttr = Object.values(attrs).some((v) => v.trim());
    if (!hasAnyAttr) {
      toast.error("Preencha ao menos um atributo da variação");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        id: editingId || undefined,
        product_id: productId,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        attributes: attrs,
        stock_quantity: parseInt(stock) || 0,
        price: price.trim() ? parseFloat(price) : null,
      });
      toast.success(editingId ? "Variação atualizada!" : "Variação adicionada!");
      resetForm();
    } catch (err) {
      toast.error(getErrorMessage(err, "Erro ao salvar variação. Verifique se o SKU/código de barras já não está em uso."));
    }
  };

  const handleDelete = async (v: Variation) => {
    if (!confirm(`Remover a variação "${formatVariationLabel(v.attributes as Record<string, unknown>)}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ id: v.id, product_id: productId });
      toast.success("Variação removida!");
    } catch {
      toast.error("Erro ao remover variação");
    }
  };

  const totalStock = variations?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Variações {variations?.length ? `(estoque total: ${totalStock})` : ""}
        </p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs flex items-center gap-1 text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar variação
          </button>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          {!!variations?.length && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Variação</th>
                    <th className="text-left px-3 py-2 font-medium">SKU</th>
                    <th className="text-left px-3 py-2 font-medium">Estoque</th>
                    <th className="text-left px-3 py-2 font-medium">Preço</th>
                    <th className="text-right px-3 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {variations.map((v) => (
                    <tr key={v.id}>
                      <td className="px-3 py-2">{formatVariationLabel(v.attributes as Record<string, unknown>)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.sku || "—"}</td>
                      <td className={`px-3 py-2 ${v.stock_quantity === 0 ? "text-destructive font-medium" : ""}`}>{v.stock_quantity}</td>
                      <td className="px-3 py-2">{v.price != null ? `R$ ${v.price.toFixed(2).replace(".", ",")}` : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(v)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(v)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showForm && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex justify-between items-center">
                <p className="text-xs font-medium">{editingId ? "Editar variação" : "Nova variação"}</p>
                <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {formFields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input
                      value={attrs[f.key] || ""}
                      onChange={(e) => setAttrs({ ...attrs, [f.key]: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 border rounded text-xs bg-background"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-muted-foreground">Estoque *</label>
                  <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="w-full mt-0.5 px-2 py-1.5 border rounded text-xs bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">SKU</label>
                  <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" className="w-full mt-0.5 px-2 py-1.5 border rounded text-xs bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Código de barras</label>
                  <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Opcional" className="w-full mt-0.5 px-2 py-1.5 border rounded text-xs bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Preço (se diferente)</label>
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`Padrão: R$ ${defaultPrice.toFixed(2)}`} className="w-full mt-0.5 px-2 py-1.5 border rounded text-xs bg-background" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="text-xs px-3 py-1.5 rounded border hover:bg-muted">Cancelar</button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                >
                  {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Salvar variação
                </button>
              </div>
            </div>
          )}

          {!variations?.length && !showForm && (
            <p className="text-xs text-muted-foreground">Nenhuma variação cadastrada ainda.</p>
          )}
        </>
      )}
    </div>
  );
};

export default VariationsManager;
