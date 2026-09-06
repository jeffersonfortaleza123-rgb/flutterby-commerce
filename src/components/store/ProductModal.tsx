import { X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import ProductDetailContent from "./ProductDetailContent";

const ProductModal = () => {
  const { quickViewProductId, setQuickViewProductId } = useCart();

  if (!quickViewProductId) return null;

  const close = () => setQuickViewProductId(null);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      <div className="relative bg-background rounded-2xl border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <button
          onClick={close}
          className="sticky top-3 float-right mr-3 z-10 p-2 rounded-full bg-background/90 border shadow hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-4 clear-both">
          <ProductDetailContent productId={quickViewProductId} onAdded={close} />
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
