import React, { createContext, useContext, useState, useCallback } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  variationId?: string | null;
  variationLabel?: string | null;
}

/** Duas linhas do carrinho são "a mesma" se forem o mesmo produto E a mesma variação. */
const sameLine = (a: { id: string; variationId?: string | null }, b: { id: string; variationId?: string | null }) =>
  a.id === b.id && (a.variationId || null) === (b.variationId || null);

interface CartContextType {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string, variationId?: string | null) => void;
  updateQuantity: (id: string, quantity: number, variationId?: string | null) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const addItem = useCallback((product: Omit<CartItem, "quantity">, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, product));
      if (existing) {
        return prev.map((i) => sameLine(i, product) ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...product, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string, variationId?: string | null) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, { id, variationId })));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number, variationId?: string | null) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => !sameLine(i, { id, variationId })));
    } else {
      setItems((prev) => prev.map((i) => sameLine(i, { id, variationId }) ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen, isCheckoutOpen, setIsCheckoutOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
