import { ShoppingBag, Search, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/useProducts";
import { Link } from "react-router-dom";
import { useState } from "react";
import defaultLogo from "@/assets/store-logo.jpg";

interface StoreHeaderProps {
  onSearch?: (query: string) => void;
}

const StoreHeader = ({ onSearch }: StoreHeaderProps) => {
  const { totalItems, setIsOpen } = useCart();
  const { data: settings } = useSiteSettings();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
      <div className="container flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={settings?.logo_url || defaultLogo} alt={settings?.store_name || "Paraíso Outlet"} className="h-10 w-10 object-contain rounded" />
          <span className="text-lg font-bold font-heading text-foreground leading-tight hidden sm:block">
            {settings?.store_name || "Paraíso"}
            <span className="block text-[10px] font-semibold tracking-[0.2em] text-primary">OUTLET</span>
          </span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-full border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Link to="/admin/login" className="p-2 rounded-full hover:bg-muted transition-colors">
            <User className="h-5 w-5 text-muted-foreground" />
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ShoppingBag className="h-5 w-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default StoreHeader;
