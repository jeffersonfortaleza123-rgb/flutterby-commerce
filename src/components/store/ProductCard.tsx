import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products"> & { categories?: { name: string } | null };
  /** Estoque disponível (lotes não vencidos). undefined = ainda carregando. */
  availableStock?: number;
}

const ProductCard = ({ product, availableStock }: ProductCardProps) => {
  const { addItem, setQuickViewProductId } = useCart();
  const isOutOfStock = availableStock === 0;

  const openQuickView = () => setQuickViewProductId(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) {
      toast.error("Produto sem estoque disponível");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openQuickView}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openQuickView(); }}
      className="group bg-card rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-all animate-fade-in cursor-pointer text-left"
    >
      <div className="aspect-square overflow-hidden bg-muted relative">
        {isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 bg-foreground/80 text-background text-xs font-semibold px-2 py-1 rounded-full">
            Esgotado
          </span>
        )}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? "grayscale opacity-70" : ""}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="p-4">
        {product.brand && (
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
            {product.brand}
          </span>
        )}
        <h3 className="font-medium text-sm mt-1 line-clamp-2 text-card-foreground">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-foreground">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </span>
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
