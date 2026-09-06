import { X, Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const CartDrawer = () => {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, isOpen, setIsOpen, setIsCheckoutOpen } = useCart();

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsOpen(false);
    setIsCheckoutOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setIsOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold font-heading">Carrinho</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div key={`${item.id}::${item.variationId || ""}`} className="flex gap-3 bg-muted/50 rounded-lg p-3">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.variationLabel && (
                      <p className="text-xs text-muted-foreground">{item.variationLabel}</p>
                    )}
                    <p className="text-sm font-bold text-primary mt-1">
                      R$ {item.price.toFixed(2).replace(".", ",")}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.variationId)} className="p-1 rounded bg-background border hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.variationId)} className="p-1 rounded bg-background border hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                      <button onClick={() => removeItem(item.id, item.variationId)} className="p-1 rounded hover:bg-destructive/10 ml-auto">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-green-500 hover:bg-green-600 text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Ir para o checkout
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full border py-2.5 rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Continuar comprando
              </button>
              <button
                onClick={clearCart}
                className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
