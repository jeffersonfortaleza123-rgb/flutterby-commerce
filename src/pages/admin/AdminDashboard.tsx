import { useProducts, useCategories, useBanners } from "@/hooks/useProducts";
import { Package, Image, Tags, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: banners } = useBanners();

  const stats = [
    { label: "Produtos", value: products?.length || 0, icon: Package, color: "text-primary" },
    { label: "Categorias", value: categories?.length || 0, icon: Tags, color: "text-accent-foreground" },
    { label: "Banners", value: banners?.length || 0, icon: Image, color: "text-secondary-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral da sua loja</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
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

      <div className="bg-background rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold font-heading">Dicas</h2>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Adicione produtos para começar a vender</li>
          <li>• Configure banners para destacar promoções</li>
          <li>• Organize seus produtos em categorias</li>
          <li>• Configure o número do WhatsApp nas configurações</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
