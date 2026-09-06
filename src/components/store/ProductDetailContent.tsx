import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Loader2, Share2, Minus, Plus } from "lucide-react";
import { useProduct, useSiteSettings } from "@/hooks/useProducts";
import { useAvailableStock } from "@/hooks/useStock";
import { useProductVariations } from "@/hooks/useVariations";
import { useCart } from "@/contexts/CartContext";
import { formatVariationLabel } from "@/lib/productTypes";
import { generateProductShareImage, shareProductImage } from "@/lib/shareImage";

interface ProductDetailContentProps {
  productId: string;
  onAdded?: () => void;
}

const ProductDetailContent = ({ productId, onAdded }: ProductDetailContentProps) => {
  const { data: product, isLoading } = useProduct(productId);
  const { data: availableStock } = useAvailableStock(productId);
  const { data: variations } = useProductVariations(productId);
  const { data: settings } = useSiteSettings();
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sharing, setSharing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">Produto não encontrado</p>
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean) as string[];
  const hasVariations = !!variations?.length;
  const selectedVariation = variations?.find((v) => v.id === selectedVariationId) || null;

  const effectivePrice = selectedVariation?.price ?? product.price;
  const effectiveStock = hasVariations ? (selectedVariation?.stock_quantity ?? null) : availableStock;
  const isOutOfStock = effectiveStock === 0;
  const needsSelection = hasVariations && !selectedVariation;
  const maxQuantity = effectiveStock ?? 99;

  const handleSelectVariation = (variationId: string) => {
    setSelectedVariationId(variationId);
    setQuantity(1);
  };

  const handleAdd = () => {
    if (needsSelection) {
      toast.error("Escolha uma opção antes de adicionar ao carrinho");
      return;
    }
    if (isOutOfStock) {
      toast.error("Produto sem estoque disponível");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      image_url: product.image_url,
      variationId: selectedVariation?.id || null,
      variationLabel: selectedVariation ? formatVariationLabel(selectedVariation.attributes as Record<string, unknown>) : null,
    }, quantity);
    setQuantity(1);
    onAdded?.();
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateProductShareImage(
        product.image_url,
        product.name,
        effectivePrice,
        settings?.store_name || "Minha Loja"
      );
      const file = new File([blob], "produto.png", { type: "image/png" });
      const result = await shareProductImage(file, product.name);
      if (result === "downloaded") {
        toast.success("Imagem baixada! Abra o Instagram e adicione ela no seu Story.");
      }
    } catch {
      toast.error("Não foi possível gerar a imagem pra compartilhar");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-3">
        <div className="aspect-square rounded-xl overflow-hidden bg-muted">
          {allImages[selectedImage] ? (
            <img src={allImages[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-16 w-16" />
            </div>
          )}
        </div>
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${i === selectedImage ? "border-primary" : "border-transparent"}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {product.brand && (
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">{product.brand}</span>
        )}
        <h1 className="text-2xl md:text-3xl font-bold font-heading">{product.name}</h1>
        {product.categories && (
          <span className="inline-block bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
            {product.categories.name}
          </span>
        )}
        <p className="text-3xl font-bold text-primary">
          R$ {effectivePrice.toFixed(2).replace(".", ",")}
        </p>
        {product.description && (
          <div className="prose prose-sm text-muted-foreground">
            <p>{product.description}</p>
          </div>
        )}

        {hasVariations && (
          <div>
            <p className="text-sm font-medium mb-2">Escolha uma opção:</p>
            <div className="flex flex-wrap gap-2">
              {variations!.map((v) => {
                const label = formatVariationLabel(v.attributes as Record<string, unknown>);
                const outOfStock = v.stock_quantity === 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => !outOfStock && handleSelectVariation(v.id)}
                    disabled={outOfStock}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedVariationId === v.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : outOfStock
                        ? "opacity-40 cursor-not-allowed line-through"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!needsSelection && !isOutOfStock && (
          <div>
            <p className="text-sm font-medium mb-2">Quantidade:</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="p-2 rounded-lg border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                className="p-2 rounded-lg border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              {effectiveStock != null && effectiveStock <= 5 && (
                <span className="text-xs text-muted-foreground">Só {effectiveStock} em estoque</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={isOutOfStock || needsSelection}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingBag className="h-5 w-5" />
          {needsSelection ? "Escolha uma opção" : isOutOfStock ? "Produto Esgotado" : `Adicionar ${quantity > 1 ? `${quantity} unidades` : ""} ao Carrinho`}
        </button>

        <button
          onClick={handleShare}
          disabled={sharing}
          className="w-full border py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Compartilhar no Instagram
        </button>
      </div>
    </div>
  );
};

export default ProductDetailContent;
