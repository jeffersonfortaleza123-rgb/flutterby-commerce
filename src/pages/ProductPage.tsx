import { useParams, Link } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import StoreHeader from "@/components/store/StoreHeader";
import CartDrawer from "@/components/store/CartDrawer";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id!);
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container py-20 text-center">
          <p className="text-lg text-muted-foreground">Produto não encontrado</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Voltar à loja</Link>
        </div>
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean) as string[];

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <CartDrawer />

      <main className="container py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

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
              R$ {product.price.toFixed(2).replace(".", ",")}
            </p>
            {product.description && (
              <div className="prose prose-sm text-muted-foreground">
                <p>{product.description}</p>
              </div>
            )}
            <button
              onClick={handleAdd}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="h-5 w-5" /> Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </main>
      <WhatsAppButton />
    </div>
  );
};

export default ProductPage;
