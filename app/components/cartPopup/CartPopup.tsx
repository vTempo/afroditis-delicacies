import { useState } from "react";
import { useCart } from "../../context/cartContext/cartContext";
import { useAuth } from "../../context/authContext/authContext";
import type { CartItem } from "../../types/types";
import "../../styles/cartPopup.css";

interface CartPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartPopup: React.FC<CartPopupProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    cartItems,
    cartTotal,
    updateQuantity,
    removeItem,
    clearCart,
    loading,
  } = useCart();
  const [editingItem, setEditingItem] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateQuantity = async (
    itemId: string,
    size: string,
    newQuantity: number,
  ) => {
    try {
      await updateQuantity(itemId, size, newQuantity);
    } catch (error) {
      console.error("Failed to update quantity:", error);
      alert("Failed to update quantity. Please try again.");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (confirm("Remove this item from your cart?")) {
      try {
        await removeItem(itemId);
      } catch (error) {
        console.error("Failed to remove item:", error);
        alert("Failed to remove item. Please try again.");
      }
    }
  };

  const handleClearCart = async () => {
    if (confirm("Are you sure you want to clear your entire cart?")) {
      try {
        await clearCart();
      } catch (error) {
        console.error("Failed to clear cart:", error);
        alert("Failed to clear cart. Please try again.");
      }
    }
  };

  const handleProceedToCheckout = () => {
    // TODO: Navigate to checkout page
    console.log("Proceeding to checkout...");
    alert("Checkout flow will be implemented next!");
  };

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          <h2 className="cart-title">Your Cart</h2>
          <button
            className="cart-close-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Cart Content */}
        <div className="cart-content">
          {loading ? (
            <div className="cart-loading">
              <svg className="spinner" viewBox="0 0 50 50">
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <p>Loading cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="cart-empty">
              <svg
                className="empty-cart-icon"
                viewBox="0 0 24 24"
                width="64"
                height="64"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <h3>Your cart is empty</h3>
              <p>Add some delicious Greek dishes to get started!</p>
              <button className="browse-menu-btn" onClick={onClose}>
                Browse Menu
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    {/* Item Image */}
                    <div className="cart-item-image">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.dishName} />
                      ) : (
                        <div className="cart-item-image-placeholder">
                          <svg
                            viewBox="0 0 24 24"
                            width="32"
                            height="32"
                            fill="currentColor"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="cart-item-details">
                      <h3 className="cart-item-name">{item.dishName}</h3>
                      <p className="cart-item-category">{item.category}</p>

                      {/* Special Instructions */}
                      {item.specialInstructions && (
                        <p className="cart-item-instructions">
                          <strong>Note:</strong> {item.specialInstructions}
                        </p>
                      )}

                      {/* Sizes and Quantities */}
                      <div className="cart-item-sizes">
                        {item.quantities.map((qty, idx) => (
                          <div key={idx} className="cart-item-size-row">
                            <span className="size-label-cart">
                              {qty.size} - ${qty.price.toFixed(2)}
                            </span>

                            <div className="cart-quantity-controls">
                              <button
                                className="cart-qty-btn minus"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    qty.size,
                                    qty.quantity - 1,
                                  )
                                }
                                disabled={loading}
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="cart-qty-display">
                                {qty.quantity}
                              </span>
                              <button
                                className="cart-qty-btn plus"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    qty.size,
                                    qty.quantity + 1,
                                  )
                                }
                                disabled={loading}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            <span className="cart-item-subtotal">
                              ${(qty.price * qty.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      className="cart-item-remove"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={loading}
                      aria-label="Remove item"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Clear Cart Button */}
              {cartItems.length > 0 && (
                <button
                  className="clear-cart-btn"
                  onClick={handleClearCart}
                  disabled={loading}
                >
                  Clear Cart
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-section">
              <div className="cart-total-row">
                <span className="cart-total-label">Subtotal:</span>
                <span className="cart-total-amount">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <p className="cart-footer-note">
                Delivery fee will be calculated at checkout
              </p>
            </div>

            <button
              className="checkout-btn"
              onClick={handleProceedToCheckout}
              disabled={loading}
            >
              Proceed to Checkout
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPopup;
