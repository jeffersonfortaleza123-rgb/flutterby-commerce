import { useState, useMemo } from "react";
import StoreHeader from "@/components/store/StoreHeader";
import BannerCarousel from "@/components/store/BannerCarousel";
import ProductCard from "@/components/store/ProductCard";
import CategoryFilter from "@/components/store/CategoryFilter";
import CategorySidebar from "@/components/store/CategorySidebar";
import CartDrawer from "@/components/store/CartDrawer";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import { useProducts, useSiteSettings } from "@/hooks/useProducts";
import { getErrorMessage } from "@/lib/errors";
import { Loader2, AlertCircle, Phone, MapPin } from "lucide-react";
import { formatPhoneDisplay, buildMapsLink } from "@/lib/format";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: products, isLoading, isError, error } = useProducts();
  const { data: settings } = useSiteSettings();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      // TEMPORARIO: estoque livre — não esconde mais por falta de estoque.
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="storefront-theme min-h-screen bg-background bg-grid-glow">
      <StoreHeader onSearch={setSearchQuery} />
      <CartDrawer />

      <main className="container py-6 space-y-8">
        <div className="text-center py-4 relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]" />
          <h1 className="font-heading font-light text-3xl md:text-5xl text-foreground tracking-wide">
            Estilo autêntico, <span className="text-primary">peça</span> a peça
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">Curadoria de tênis, moda e beleza com preço de outlet</p>
        </div>

        <BannerCarousel />

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
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            {settings?.whatsapp_number && (
              <a href={`tel:+${settings.whatsapp_number.replace(/\D/g, "")}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                {formatPhoneDisplay(settings.whatsapp_number)}
              </a>
            )}
            {settings?.store_address && (
              (() => {
                const mapsLink = buildMapsLink(settings.store_maps_link, settings.store_address);
                return mapsLink ? (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <MapPin className="h-4 w-4" />
                    {settings.store_address}
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {settings.store_address}
                  </span>
                );
              })()
            )}
          </div>
          <p>© {new Date().getFullYear()} {settings?.store_name || "Paraíso Outlet"}. Todos os direitos reservados.</p>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
};

export default Index;
