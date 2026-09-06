import { useParams, Link } from "react-router-dom";
import StoreHeader from "@/components/store/StoreHeader";
import CartDrawer from "@/components/store/CartDrawer";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import ProductDetailContent from "@/components/store/ProductDetailContent";
import { ArrowLeft } from "lucide-react";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <CartDrawer />

      <main className="container py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <ProductDetailContent productId={id!} />
      </main>
      <WhatsAppButton />
    </div>
  );
};

export default ProductPage;
