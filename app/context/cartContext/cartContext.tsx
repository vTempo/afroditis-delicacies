import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../authContext/authContext";
import {
  getCart,
  addToCart as addToCartService,
  updateCartItemQuantity as updateCartItemService,
  removeFromCart as removeFromCartService,
  clearCart as clearCartService,
} from "../../services/cartService";
import type { CartItem } from "../../types/types";

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  loading: boolean;
  addToCart: (
    item: Omit<CartItem, "id" | "userId" | "addedAt">,
  ) => Promise<void>;
  updateQuantity: (
    itemId: string,
    size: string,
    quantity: number,
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate cart metrics
  const cartCount = cartItems.reduce((total, item) => {
    return total + item.quantities.reduce((sum, q) => sum + q.quantity, 0);
  }, 0);

  const cartTotal = cartItems.reduce((total, item) => {
    return (
      total + item.quantities.reduce((sum, q) => sum + q.price * q.quantity, 0)
    );
  }, 0);

  // Load cart when user changes
  useEffect(() => {
    async function loadCart() {
      if (!user) {
        setCartItems([]);
        return;
      }

      try {
        setLoading(true);
        const items = await getCart(user.uid);
        setCartItems(items);
      } catch (error) {
        console.error("Failed to load cart:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, [user]);

  // Add item to cart
  async function addToCart(
    item: Omit<CartItem, "id" | "userId" | "addedAt">,
  ): Promise<void> {
    if (!user) {
      throw new Error("Must be logged in to add items to cart");
    }

    try {
      await addToCartService(user.uid, item);
      await refreshCart();
    } catch (error) {
      console.error("Failed to add to cart:", error);
      throw error;
    }
  }

  // Update item quantity
  async function updateQuantity(
    itemId: string,
    size: string,
    quantity: number,
  ): Promise<void> {
    if (!user) {
      throw new Error("Must be logged in to update cart");
    }

    try {
      await updateCartItemService(user.uid, itemId, size, quantity);
      await refreshCart();
    } catch (error) {
      console.error("Failed to update quantity:", error);
      throw error;
    }
  }

  // Remove item from cart
  async function removeItem(itemId: string): Promise<void> {
    if (!user) {
      throw new Error("Must be logged in to remove items");
    }

    try {
      await removeFromCartService(user.uid, itemId);
      await refreshCart();
    } catch (error) {
      console.error("Failed to remove item:", error);
      throw error;
    }
  }

  // Clear entire cart
  async function clearCart(): Promise<void> {
    if (!user) {
      throw new Error("Must be logged in to clear cart");
    }

    try {
      await clearCartService(user.uid);
      setCartItems([]);
    } catch (error) {
      console.error("Failed to clear cart:", error);
      throw error;
    }
  }

  // Refresh cart from Firestore
  async function refreshCart(): Promise<void> {
    if (!user) return;

    try {
      const items = await getCart(user.uid);
      setCartItems(items);
    } catch (error) {
      console.error("Failed to refresh cart:", error);
      throw error;
    }
  }

  const value: CartContextType = {
    cartItems,
    cartCount,
    cartTotal,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
