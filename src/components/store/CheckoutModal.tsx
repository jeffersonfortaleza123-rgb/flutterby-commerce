import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShoppingBag, CheckCircle2, X, Truck, Store, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/useProducts";
import { useCreateOrder } from "@/hooks/useOrders";
import { getErrorMessage } from "@/lib/errors";

type DeliveryMethod = "entrega" | "retirada";

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

const CheckoutModal = () => {
  const { items, totalPrice, clearCart, isCheckoutOpen, setIsCheckoutOpen } = useCart();
  const { data: settings } = useSiteSettings();
  const createOrder = useCreateOrder();

  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("entrega");
  const [orderResult, setOrderResult] = useState<{ orderNumber: number } | null>(null);

  if (!isCheckoutOpen) return null;

  const close = () => {
    setIsCheckoutOpen(false);
    setTimeout(() => {
      setOrderResult(null);
      setForm({ name: "", phone: "", address: "" });
      setDeliveryMethod("entrega");
    }, 200);
  };

  const buildWhatsAppMessage = (orderNumber: number) => {
    const greeting = settings?.whatsapp_message || "Olá! Gostaria de finalizar meu pedido:";
    const productLines = items
      .map((item) => `• ${item.quantity}x ${item.name}${item.variationLabel ? ` (${item.variationLabel})` : ""} — ${formatPrice(item.price * item.quantity)}`)
      .join("\n");

    const deliveryLine = deliveryMethod === "entrega"
      ? `Forma de entrega: Entrega\nEndereço: ${form.address}`
      : `Forma de entrega: Retirada na loja${settings?.store_address ? `\nEndereço da loja: ${settings.store_address}` : ""}`;

    const customerLines = [
      `\n\nCliente: ${form.name}`,
      `Telefone: ${form.phone}`,
      deliveryLine,
    ].filter(Boolean).join("\n");

    return encodeURIComponent(
      `${greeting}\n\nPedido #${orderNumber}\n\n${productLines}\n\nTotal: ${formatPrice(totalPrice)}${customerLines}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!items.length) {
      toast.error("Seu carrinho está vazio");
      return;
    }
    if (deliveryMethod === "entrega" && !form.address.trim()) {
      toast.error("Informe o endereço de entrega");
      return;
    }

    try {
      const result = await createOrder.mutateAsync({
        name: form.name,
        phone: form.phone,
        address: deliveryMethod === "entrega" ? form.address : "",
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity, variation_id: item.variationId || null })),
        deliveryMethod,
      });

      const phone = settings?.whatsapp_number || "5500000000000";
      const message = buildWhatsAppMessage(result.order_number);
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");

      setOrderResult({ orderNumber: result.order_number });
      clearCart();
    } catch (err) {
      toast.error(getErrorMessage(err, "Erro ao criar o pedido"));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      <div className="relative bg-background rounded-2xl border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold font-heading text-lg">
            {orderResult ? "Pedido confirmado!" : "Finalizar pedido"}
          </h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {orderResult ? (
            <div className="text-center space-y-4 py-6">
              <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
              <h3 className="text-xl font-bold font-heading">Pedido #{orderResult.orderNumber} registrado!</h3>
              <p className="text-muted-foreground text-sm">
                Abrimos o WhatsApp com os detalhes do seu pedido. Se a janela não abriu, confira se seu navegador bloqueou o pop-up.
              </p>
              <button
                onClick={close}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors mt-2"
              >
                Continuar comprando
              </button>
            </div>
          ) : !items.length ? (
            <div className="text-center space-y-3 py-8">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
            </div>
          ) : (
            <>
              <div className="bg-muted/30 rounded-xl border p-4 mb-5 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Resumo do pedido</h3>
                {items.map((item) => (
                  <div key={`${item.id}::${item.variationId || ""}`} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}{item.variationLabel ? ` (${item.variationLabel})` : ""}</span>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Como você quer receber? *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("entrega")}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-colors ${
                        deliveryMethod === "entrega" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                      <span className="text-sm font-medium">Entrega</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("retirada")}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-colors ${
                        deliveryMethod === "retirada" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <Store className="h-5 w-5" />
                      <span className="text-sm font-medium">Retirada na loja</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Nome completo *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone (WhatsApp) *</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    type="tel"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {deliveryMethod === "entrega" ? (
                  <div>
                    <label className="text-sm font-medium">Endereço de entrega *</label>
                    <textarea
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={3}
                      required
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>
                ) : (
                  (settings?.store_address || settings?.store_maps_link) && (
                    <div className="bg-muted/30 rounded-lg border p-3 space-y-1.5">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" /> Retire seu pedido em:
                      </p>
                      {settings?.store_address && <p className="text-sm text-muted-foreground">{settings.store_address}</p>}
                      {settings?.store_maps_link && (
                        <a href={settings.store_maps_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-block">
                          Ver no Google Maps →
                        </a>
                      )}
                    </div>
                  )
                )}

                <button
                  type="submit"
                  disabled={createOrder.isPending}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Finalizar pedido pelo WhatsApp
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
