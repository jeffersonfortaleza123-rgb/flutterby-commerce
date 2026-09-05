import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAllBatches } from "@/hooks/useBatches";
import { getExpiryStatus, getDaysRemaining, EXPIRY_STATUS_META, type ExpiryStatus } from "@/lib/expiry";

const FILTERS: { value: ExpiryStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "normal", label: "🟢 Normal" },
  { value: "proximo", label: "🟡 Próximo" },
  { value: "vencendo", label: "🔴 Vencendo" },
  { value: "vencido", label: "⚫ Vencido" },
];

const AdminExpiry = () => {
  const { data: batches, isLoading } = useAllBatches();
  const [filter, setFilter] = useState<ExpiryStatus | "todos">("todos");

  const rows = useMemo(() => {
    if (!batches) return [];
    return batches
      .filter((b) => b.quantity > 0)
      .map((b) => ({ ...b, status: getExpiryStatus(b.expiry_date), daysRemaining: getDaysRemaining(b.expiry_date) }))
      .filter((b) => filter === "todos" || b.status === filter)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [batches, filter]);

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
                  <th className="text-left px-4 py-3 font-medium">Lote</th>
                  <th className="text-left px-4 py-3 font-medium">Quantidade</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Validade</th>
                  <th className="text-left px-4 py-3 font-medium">Dias restantes</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((b) => {
                  const meta = EXPIRY_STATUS_META[b.status];
                  return (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {b.products?.name || "—"}
                        {b.products?.active === false && (
                          <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{b.batch_number}</td>
                      <td className="px-4 py-3">{b.quantity}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">{new Date(b.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        {b.daysRemaining >= 0 ? `${b.daysRemaining} dias` : `venceu há ${Math.abs(b.daysRemaining)} dias`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${meta.className}`}>{meta.emoji} {meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum lote encontrado para esse filtro</td></tr>
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
