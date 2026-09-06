import { Link } from "react-router-dom";
import { useProducts, useCategories, useBanners } from "@/hooks/useProducts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Package, Image, Tags, TrendingUp, PackageX, PackageMinus, AlertTriangle, Ban, ClipboardList, Loader2 } from "lucide-react";

const AdminDashboard = () => {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: banners } = useBanners();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const catalogStats = [
    { label: "Produtos", value: products?.length || 0, icon: Package, color: "text-primary" },
    { label: "Categorias", value: categories?.length || 0, icon: Tags, color: "text-accent-foreground" },
    { label: "Banners", value: banners?.length || 0, icon: Image, color: "text-secondary-foreground" },
  ];

  const stockAndOrderStats = stats ? [
    { label: "Estoque baixo", value: stats.lowStock, icon: PackageMinus, color: "text-yellow-600", bg: "bg-yellow-50", href: "/admin/batches" },
    { label: "Sem estoque", value: stats.outOfStock, icon: PackageX, color: "text-red-600", bg: "bg-red-50", href: "/admin/batches" },
    { label: "Próx. do vencimento", value: stats.nearExpiry, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", href: "/admin/expiry" },
    { label: "Vencidos", value: stats.expired, icon: Ban, color: "text-gray-600", bg: "bg-gray-100", href: "/admin/expiry" },
    { label: "Pedidos novos", value: stats.newOrders, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/orders" },
    { label: "Em andamento", value: stats.inProgressOrders, icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/orders" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral da sua loja</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {catalogStats.map((stat) => (
          <div key={stat.label} className="bg-background rounded-xl border p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold font-heading mb-3">Estoque, validade e pedidos</h2>
        {statsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stockAndOrderStats.map((stat) => (
              <Link
                key={stat.label}
                to={stat.href}
                className="bg-background rounded-xl border p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
              >
                <div className={`p-2 rounded-lg w-fit ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-background rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold font-heading">Dicas</h2>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Adicione produtos para começar a vender</li>
          <li>• Cadastre lotes em "Estoque e Lotes" para controlar validade e disponibilidade</li>
          <li>• Acompanhe pedidos novos em "Pedidos" e atualize o status conforme avançam</li>
          <li>• Configure o número do WhatsApp nas configurações</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
