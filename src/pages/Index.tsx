import { useState, useMemo } from "react";
import StoreHeader from "@/components/store/StoreHeader";
import BannerCarousel from "@/components/store/BannerCarousel";
import ProductCard from "@/components/store/ProductCard";
import CategoryFilter from "@/components/store/CategoryFilter";
import CategorySidebar from "@/components/store/CategorySidebar";
import CartDrawer from "@/components/store/CartDrawer";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import { useProducts, useSiteSettings } from "@/hooks/useProducts";
import { useStockMap } from "@/hooks/useStock";
import { getErrorMessage } from "@/lib/errors";
import { Loader2, AlertCircle } from "lucide-react";
import heroBanner from "@/assets/hero-banner.png";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: products, isLoading, isError, error } = useProducts();
  const { data: settings } = useSiteSettings();
  const { data: stockMap } = useStockMap(products?.map((p) => p.id) || []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      // Só esconde por estoque depois que o mapa de estoque já carregou —
      // antes disso, stockMap ainda é undefined e não sabemos o estoque real.
      const isOutOfStock = !!stockMap && stockMap[p.id] === 0;
      return matchesCategory && matchesSearch && !isOutOfStock;
    });
  }, [products, selectedCategory, searchQuery, stockMap]);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader onSearch={setSearchQuery} />
      <CartDrawer />

      <main className="container py-6 space-y-8">
        <BannerCarousel />

        <div className="rounded-2xl overflow-hidden">
          <img src={heroBanner} alt={settings?.store_name || "Paraíso Outlet"} className="w-full h-auto object-cover" />
        </div>

        <div className="lg:hidden">
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        <div className="flex gap-8 items-start">
          <CategorySidebar selected={selectedCategory} onSelect={setSelectedCategory} />

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="text-center py-20 text-destructive">
                <AlertCircle className="h-10 w-10 mx-auto mb-3" />
                <p className="text-lg font-medium">Não foi possível carregar os produtos</p>
                <p className="text-sm mt-1 text-muted-foreground">{getErrorMessage(error, "Tente recarregar a página em instantes.")}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">Tente uma busca diferente ou selecione outra categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} availableStock={stockMap?.[product.id]} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings?.store_name || "Paraíso Outlet"}. Todos os direitos reservados.</p>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
};

export default Index;
