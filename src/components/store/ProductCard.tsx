import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products"> & { categories?: { name: string } | null };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
  };

  return (
    <Link
      to={`/produto/${product.id}`}
      className="group bg-card rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-all animate-fade-in"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
            className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-colors"
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
