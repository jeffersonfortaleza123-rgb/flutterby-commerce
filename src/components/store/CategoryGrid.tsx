import { useCategories } from "@/hooks/useProducts";
import type { Tables } from "@/integrations/supabase/types";

interface CategoryGridProps {
  onSelect: (id: string) => void;
}

const CategoryTile = ({ category, className, onSelect }: { category: Tables<"categories">; className?: string; onSelect: (id: string) => void }) => (
  <button
    onClick={() => onSelect(category.id)}
    className={`group relative overflow-hidden rounded-xl text-left ${className || ""}`}
  >
    {category.image_url ? (
      <img
        src={category.image_url}
        alt={category.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
    ) : (
      <div className="absolute inset-0 bg-muted" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
    <span className="absolute bottom-4 left-4 font-heading font-light text-xl md:text-2xl text-foreground tracking-wide">
      {category.name}
    </span>
  </button>
);

const CategoryGrid = ({ onSelect }: CategoryGridProps) => {
  const { data: categories } = useCategories();

  if (!categories?.length) return null;

  const [first, ...rest] = categories;
  const secondary = rest.slice(0, 2);

  return (
    <section>
      <h2 className="font-heading font-light text-2xl md:text-3xl text-center mb-6">
        Explore por <span className="text-primary">categoria</span>
      </h2>

      {secondary.length === 0 ? (
        <CategoryTile category={first} onSelect={onSelect} className="h-64 md:h-80 w-full" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:h-[420px]">
          <CategoryTile category={first} onSelect={onSelect} className="h-56 sm:h-full sm:col-span-2" />
          <div className="grid grid-rows-2 gap-3 sm:col-span-1">
            {secondary.map((cat) => (
              <CategoryTile key={cat.id} category={cat} onSelect={onSelect} className="h-40 sm:h-full" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default CategoryGrid;
