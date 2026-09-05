import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShoppingBag, CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/useProducts";
import { useCreateOrder } from "@/hooks/useOrders";
import StoreHeader from "@/components/store/StoreHeader";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { data: settings } = useSiteSettings();
  const createOrder = useCreateOrder();

  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [orderResult, setOrderResult] = useState<{ orderNumber: number } | null>(null);

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

  const buildWhatsAppMessage = (orderNumber: number) => {
    const greeting = settings?.whatsapp_message || "Olá! Gostaria de finalizar meu pedido:";
    const productLines = items
      .map((item) => `• ${item.quantity}x ${item.name} — ${formatPrice(item.price * item.quantity)}`)
      .join("\n");
    const customerLines = [
      `\n\nCliente: ${form.name}`,
      `Telefone: ${form.phone}`,
      form.address ? `Endereço: ${form.address}` : null,
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

    try {
      const result = await createOrder.mutateAsync({
        name: form.name,
        phone: form.phone,
        address: form.address,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });

      const phone = settings?.whatsapp_number || "5500000000000";
      const message = buildWhatsAppMessage(result.order_number);
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");

      setOrderResult({ orderNumber: result.order_number });
      clearCart();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar o pedido";
      toast.error(message);
    }
  };

  if (orderResult) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <main className="container py-16 max-w-md mx-auto text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
          <h1 className="text-2xl font-bold font-heading">Pedido #{orderResult.orderNumber} registrado!</h1>
          <p className="text-muted-foreground">
            Abrimos o WhatsApp com os detalhes do seu pedido. Se a janela não abriu, confira se seu navegador bloqueou o pop-up.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors mt-4"
          >
            Voltar à loja
          </Link>
        </main>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <main className="container py-16 text-center space-y-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg text-muted-foreground">Seu carrinho está vazio</p>
          <Link to="/" className="text-primary hover:underline inline-block">Voltar à loja</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <main className="container py-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-2xl font-bold font-heading mb-6">Finalizar pedido</h1>

        <div className="bg-muted/30 rounded-xl border p-4 mb-6 space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground mb-2">Resumo do pedido</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
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
          <div>
            <label className="text-sm font-medium">Endereço de entrega</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <button
            type="submit"
            disabled={createOrder.isPending}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Finalizar pedido pelo WhatsApp
          </button>
        </form>
      </main>
    </div>
  );
};

export default Checkout;
