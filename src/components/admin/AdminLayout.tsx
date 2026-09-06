import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Package, Image, Tags, Settings, LogOut, LayoutDashboard, Menu, X, Boxes, AlertTriangle, History, ClipboardList } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Pedidos", path: "/admin/orders", icon: ClipboardList },
  { label: "Produtos", path: "/admin/products", icon: Package },
  { label: "Estoque e Lotes", path: "/admin/batches", icon: Boxes },
  { label: "Vencimentos", path: "/admin/expiry", icon: AlertTriangle },
  { label: "Movimentações", path: "/admin/stock-movements", icon: History },
  { label: "Banners", path: "/admin/banners", icon: Image },
  { label: "Categorias", path: "/admin/categories", icon: Tags },
  { label: "Configurações", path: "/admin/settings", icon: Settings },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 md:z-auto h-screen w-64 bg-background border-r flex flex-col transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <Link to="/admin" className="text-lg font-bold font-heading text-primary">Admin</Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            Ver Loja
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background border-b h-14 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-semibold font-heading text-foreground">
            {navItems.find((i) => i.path === location.pathname)?.label || "Admin"}
          </h2>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
