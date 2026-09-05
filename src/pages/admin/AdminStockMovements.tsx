import { Loader2 } from "lucide-react";
import { useStockMovements } from "@/hooks/useStockMovements";

const TYPE_META: Record<string, { label: string; className: string }> = {
  entrada: { label: "Entrada", className: "bg-green-100 text-green-700" },
  saida: { label: "Saída", className: "bg-red-100 text-red-700" },
  ajuste: { label: "Ajuste", className: "bg-blue-100 text-blue-700" },
  devolucao: { label: "Devolução", className: "bg-yellow-100 text-yellow-700" },
};

const AdminStockMovements = () => {
  const { data: movements, isLoading } = useStockMovements();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">Movimentações de Estoque</h1>
      <p className="text-sm text-muted-foreground">Histórico de entradas, saídas, ajustes e devoluções — as 200 mais recentes.</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Produto</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Quantidade</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements?.map((m) => {
                  const meta = TYPE_META[m.movement_type] || { label: m.movement_type, className: "bg-muted text-muted-foreground" };
                  return (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 font-medium">{m.products?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${m.quantity < 0 ? "text-destructive" : ""}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{m.reason || "—"}</td>
                    </tr>
                  );
                })}
                {!movements?.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhuma movimentação registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStockMovements;
