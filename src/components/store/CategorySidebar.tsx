import { Footprints, Sparkles, Shirt, Tag, LayoutGrid } from "lucide-react";
import { useCategories } from "@/hooks/useProducts";

interface CategorySidebarProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/** Escolhe um ícone com base em palavras-chave no nome da categoria. */
const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (/tênis|tenis|calçado|calcado|sapato/.test(lower)) return Footprints;
  if (/maquiagem|cosmético|cosmetico|beleza/.test(lower)) return Sparkles;
  if (/roupa|vestu|moda/.test(lower)) return Shirt;
  return Tag;
};

const CategorySidebar = ({ selected, onSelect }: CategorySidebarProps) => {
  const { data: categories } = useCategories();

  if (!categories?.length) return null;

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 px-3">Categorias</p>
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            !selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Todos os produtos
        </button>
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.name);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selected === cat.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.name}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default CategorySidebar;
