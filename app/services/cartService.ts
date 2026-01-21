import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { CartItem } from "../types/types";

/**
 * Get user's cart items
 */
export async function getCart(userId: string): Promise<CartItem[]> {
  try {
    const cartRef = collection(db, "carts");
    const q = query(cartRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        menuItemId: data.menuItemId,
        dishName: data.dishName,
        category: data.category,
        imageUrl: data.imageUrl || "",
        quantities: data.quantities || [],
        specialInstructions: data.specialInstructions || "",
        addedAt: data.addedAt?.toDate() || new Date(),
      } as CartItem;
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    throw new Error("Failed to fetch cart");
  }
}

/**
 * Add item to cart
 */
export async function addToCart(
  userId: string,
  item: Omit<CartItem, "id" | "userId" | "addedAt">,
): Promise<void> {
  try {
    const cartRef = collection(db, "carts");

    // Check if item already exists in cart
    const q = query(
      cartRef,
      where("userId", "==", userId),
      where("menuItemId", "==", item.menuItemId),
    );
    const existingItems = await getDocs(q);

    if (!existingItems.empty) {
      // Item exists - update quantities
      const existingDoc = existingItems.docs[0];
      const existingData = existingDoc.data();
      const existingQuantities = existingData.quantities || [];

      // Merge quantities
      const updatedQuantities = [...existingQuantities];
      item.quantities.forEach((newQty) => {
        const existingIndex = updatedQuantities.findIndex(
          (q) => q.size === newQty.size,
        );

        if (existingIndex >= 0) {
          // Update existing size quantity
          updatedQuantities[existingIndex].quantity += newQty.quantity;
        } else {
          // Add new size
          updatedQuantities.push(newQty);
        }
      });

      // Update special instructions (append if exists)
      let updatedInstructions = existingData.specialInstructions || "";
      if (item.specialInstructions) {
        updatedInstructions = updatedInstructions
          ? `${updatedInstructions}\n${item.specialInstructions}`
          : item.specialInstructions;
      }

      await updateDoc(existingDoc.ref, {
        quantities: updatedQuantities,
        specialInstructions: updatedInstructions,
        addedAt: Timestamp.now(),
      });
    } else {
      // Add new item
      await addDoc(cartRef, {
        userId,
        menuItemId: item.menuItemId,
        dishName: item.dishName,
        category: item.category,
        imageUrl: item.imageUrl || "",
        quantities: item.quantities,
        specialInstructions: item.specialInstructions || "",
        addedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw new Error("Failed to add item to cart");
  }
}

/**
 * Update cart item quantity for a specific size
 */
export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  size: string,
  quantity: number,
): Promise<void> {
  try {
    const cartItemRef = doc(db, "carts", cartItemId);

    // Get current item
    const cartRef = collection(db, "carts");
    const q = query(cartRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const itemDoc = snapshot.docs.find((doc) => doc.id === cartItemId);
    if (!itemDoc) {
      throw new Error("Cart item not found");
    }

    const currentData = itemDoc.data();
    const quantities = currentData.quantities || [];

    // Update quantity for specific size
    const updatedQuantities = quantities.map((q: any) => {
      if (q.size === size) {
        return { ...q, quantity };
      }
      return q;
    });

    // Remove items with quantity 0
    const filteredQuantities = updatedQuantities.filter(
      (q: any) => q.quantity > 0,
    );

    if (filteredQuantities.length === 0) {
      // If no quantities left, remove item from cart
      await deleteDoc(cartItemRef);
    } else {
      await updateDoc(cartItemRef, {
        quantities: filteredQuantities,
      });
    }
  } catch (error) {
    console.error("Error updating cart item quantity:", error);
    throw new Error("Failed to update quantity");
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: string,
  cartItemId: string,
): Promise<void> {
  try {
    const cartItemRef = doc(db, "carts", cartItemId);
    await deleteDoc(cartItemRef);
  } catch (error) {
    console.error("Error removing from cart:", error);
    throw new Error("Failed to remove item from cart");
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(userId: string): Promise<void> {
  try {
    const cartRef = collection(db, "carts");
    const q = query(cartRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw new Error("Failed to clear cart");
  }
}
