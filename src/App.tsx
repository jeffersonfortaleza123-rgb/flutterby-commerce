import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";

// Páginas fora da Index carregam sob demanda: quem só está navegando
// pela loja não precisa baixar o código do checkout nem do admin.
const ProductPage = lazy(() => import("./pages/ProductPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminGuard = lazy(() => import("./components/admin/AdminGuard"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminBatches = lazy(() => import("./pages/admin/AdminBatches"));
const AdminExpiry = lazy(() => import("./pages/admin/AdminExpiry"));
const AdminStockMovements = lazy(() => import("./pages/admin/AdminStockMovements"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita refazer a mesma consulta toda vez que o usuário volta pra
      // aba ou navega de novo pra uma página já vista nos últimos 30s.
      // A sincronização em tempo real já cobre mudanças reais nesse meio-tempo.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  useRealtimeSync();

  return (
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/produto/:id" element={<ProductPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<AdminGuard />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/products" element={<AdminProducts />} />
                    <Route path="/admin/batches" element={<AdminBatches />} />
                    <Route path="/admin/expiry" element={<AdminExpiry />} />
                    <Route path="/admin/stock-movements" element={<AdminStockMovements />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/banners" element={<AdminBanners />} />
                    <Route path="/admin/categories" element={<AdminCategories />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
