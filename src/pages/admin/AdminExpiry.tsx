import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getExpiryStatus, getDaysRemaining, EXPIRY_STATUS_META, type ExpiryStatus } from "@/lib/expiry";

const FILTERS: { value: ExpiryStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "normal", label: "🟢 Normal" },
  { value: "proximo", label: "🟡 Próximo" },
  { value: "vencendo", label: "🔴 Vencendo" },
  { value: "vencido", label: "⚫ Vencido" },
];

const AdminExpiry = () => {
  const [filter, setFilter] = useState<ExpiryStatus | "todos">("todos");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products-expiry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, expiry_date, active")
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => p.expiry_date)
      .map((p) => ({ ...p, status: getExpiryStatus(p.expiry_date!), daysRemaining: getDaysRemaining(p.expiry_date!) }))
      .filter((p) => filter === "todos" || p.status === filter)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [products, filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">Produtos Próximos do Vencimento</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Produto</th>
                  <th className="text-left px-4 py-3 font-medium">Estoque</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Validade</th>
                  <th className="text-left px-4 py-3 font-medium">Dias restantes</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p) => {
                  const meta = EXPIRY_STATUS_META[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {p.name}
                        {!p.active && <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>}
                      </td>
                      <td className="px-4 py-3">{p.stock_quantity}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">{new Date(p.expiry_date! + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        {p.daysRemaining >= 0 ? `${p.daysRemaining} dias` : `venceu há ${Math.abs(p.daysRemaining)} dias`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${meta.className}`}>{meta.emoji} {meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto com validade cadastrada para esse filtro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpiry;
