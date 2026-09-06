import { useState, Fragment } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminOrders,
  useUpdateOrderStatus,
  getNextStatusOptions,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/hooks/useOrdersAdmin";
import { getErrorMessage } from "@/lib/errors";

const FILTERS: { value: OrderStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "confirmado", label: "Confirmado" },
  { value: "preparacao", label: "Em preparação" },
  { value: "enviado", label: "Enviado" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
];

const AdminOrders = () => {
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const { data: orders, isLoading } = useAdminOrders(filter === "todos" ? undefined : filter);
  const updateStatus = useUpdateOrderStatus();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

  const handleStatusChange = async (orderId: string, status: OrderStatus, currentStatus: OrderStatus) => {
    if (status === currentStatus) return;
    if (status === "cancelado" && !confirm("Cancelar este pedido? Se o estoque já tinha sido baixado, ele será devolvido automaticamente.")) {
      return;
    }
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success("Status do pedido atualizado!");
    } catch (err) {
      const message = getErrorMessage(err, "Erro ao atualizar o pedido");
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">Pedidos</h1>

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
                  <th className="text-left px-4 py-3 font-medium">Pedido</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Itens</th>
                  <th className="text-left px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders?.map((order) => {
                  const meta = ORDER_STATUS_META[order.status];
                  const itemCount = order.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                  const isExpanded = expandedId === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold">#{order.order_number}</td>
                        <td className="px-4 py-3">{order.customers?.name || "—"}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">{itemCount}</td>
                        <td className="px-4 py-3 font-medium">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus, order.status)}
                            disabled={updateStatus.isPending}
                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${meta.className}`}
                          >
                            {getNextStatusOptions(order.status).map((s) => (
                              <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="p-1.5 rounded hover:bg-muted"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-muted/20">
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium mb-1">Cliente</p>
                                <p className="text-muted-foreground">{order.customers?.name}</p>
                                <p className="text-muted-foreground">{order.customers?.phone}</p>
                                <p className="text-muted-foreground">
                                  {order.delivery_method === "retirada" ? "🏬 Retirada na loja" : "🚚 Entrega"}
                                </p>
                                {order.customers?.address && <p className="text-muted-foreground">{order.customers.address}</p>}
                              </div>
                              <div>
                                <p className="font-medium mb-1">Itens do pedido</p>
                                <div className="space-y-0.5">
                                  {order.order_items?.map((item) => (
                                    <div key={item.id} className="flex justify-between text-muted-foreground">
                                      <span>{item.quantity}x {item.product_name}{item.variation_label ? ` (${item.variation_label})` : ""}</span>
                                      <span className="font-medium text-foreground">{formatPrice(item.unit_price * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                                {order.notes && <p className="text-muted-foreground mt-2">Obs: {order.notes}</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!orders?.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
