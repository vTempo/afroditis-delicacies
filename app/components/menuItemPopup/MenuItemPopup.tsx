import { useState } from "react";
import { useAuth } from "../../context/authContext/authContext";
import { useCart } from "../../context/cartContext/cartContext";
import type { MenuItem, CartItemQuantity } from "../../types/types";
import "../../styles/menuItemPopup.css";

interface MenuItemPopupProps {
  item: MenuItem;
  hasTwoSizes: boolean;
  onClose: () => void;
}

const MenuItemPopup: React.FC<MenuItemPopupProps> = ({
  item,
  hasTwoSizes,
  onClose,
}) => {
  const { user } = useAuth();
  const { addToCart } = useCart();

  // Determine if item actually has two sizes with valid prices
  const actuallyHasTwoSizes =
    hasTwoSizes && item.secondPrice && item.secondPrice > 0;

  // State for quantities - support both single and two-size items
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    single: 0,
    large: 0,
    small: 0,
  });

  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_INSTRUCTIONS_LENGTH = 140;

  // Calculate total based on selected quantities
  const calculateTotal = (): number => {
    if (actuallyHasTwoSizes) {
      // ← Changed from hasTwoSizes
      const largeTotal = quantities.large * item.price;
      const smallTotal = quantities.small * (item.secondPrice || 0);
      return largeTotal + smallTotal;
    } else {
      return quantities.single * item.price;
    }
  };

  const totalPrice = calculateTotal();
  const hasSelection = actuallyHasTwoSizes
    ? quantities.large > 0 || quantities.small > 0
    : quantities.single > 0;

  // Handle quantity change
  const updateQuantity = (size: string, delta: number) => {
    setQuantities((prev) => {
      const newQuantity = Math.max(0, prev[size] + delta);
      return { ...prev, [size]: newQuantity };
    });
    setError(null);
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!user) {
      setError("Please sign in to add items to your cart");
      return;
    }

    if (!hasSelection) {
      setError("Please select at least one item");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build quantities array for cart
      // Build quantities array for cart
      const cartQuantities: CartItemQuantity[] = [];

      if (actuallyHasTwoSizes) {
        // ← Changed from hasTwoSizes
        if (quantities.large > 0) {
          cartQuantities.push({
            size: "Large",
            price: item.price,
            quantity: quantities.large,
          });
        }
        if (quantities.small > 0) {
          cartQuantities.push({
            size: "Small",
            price: item.secondPrice || 0,
            quantity: quantities.small,
          });
        }
      } else {
        if (quantities.single > 0) {
          cartQuantities.push({
            size: "Single",
            price: item.price,
            quantity: quantities.single,
          });
        }
      }

      // Add to cart
      await addToCart({
        menuItemId: item.id,
        dishName: item.name,
        category: item.category,
        imageUrl: item.imgPath || "",
        quantities: cartQuantities,
        specialInstructions: specialInstructions.trim(),
      });

      // Success - close popup
      onClose();
    } catch (err: any) {
      console.error("Failed to add to cart:", err);
      setError(err.message || "Failed to add to cart. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle special instructions change
  const handleInstructionsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    if (value.length <= MAX_INSTRUCTIONS_LENGTH) {
      setSpecialInstructions(value);
    }
  };

  return (
    <div className="menu-item-overlay" onClick={onClose}>
      <div className="menu-item-popup" onClick={(e) => e.stopPropagation()}>
        {/* Dish Image */}
        {item.imgPath ? (
          <img
            src={item.imgPath}
            alt={item.name}
            className="popup-dish-image"
          />
        ) : (
          <div
            className="popup-dish-image"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #e8e8e0 0%, #f5f5f0 100%)",
              color: "#999",
              fontSize: "1rem",
            }}
          >
            No image available
          </div>
        )}

        {/* Content */}
        <div className="popup-content">
          {/* Dish Name */}
          <h2 className="popup-dish-title">{item.name}</h2>

          {/* Options Title */}
          <p className="popup-options-title">Options:</p>

          {/* Size Selection */}
          <div className="size-options">
            {actuallyHasTwoSizes ? (
              <>
                {/* Large Size */}
                <div className="size-option">
                  <div className="size-info">
                    <span className="size-label">Large</span>
                    <span className="size-price">${item.price.toFixed(2)}</span>
                  </div>
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn minus-btn"
                      onClick={() => updateQuantity("large", -1)}
                      disabled={quantities.large === 0}
                      aria-label="Decrease large quantity"
                    >
                      −
                    </button>
                    <span className="quantity-display">{quantities.large}</span>
                    <button
                      className="quantity-btn plus-btn"
                      onClick={() => updateQuantity("large", 1)}
                      aria-label="Increase large quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Small Size */}
                <div className="size-option">
                  <div className="size-info">
                    <span className="size-label">Small</span>
                    <span className="size-price">
                      ${(item.secondPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn minus-btn"
                      onClick={() => updateQuantity("small", -1)}
                      disabled={quantities.small === 0}
                      aria-label="Decrease small quantity"
                    >
                      −
                    </button>
                    <span className="quantity-display">{quantities.small}</span>
                    <button
                      className="quantity-btn plus-btn"
                      onClick={() => updateQuantity("small", 1)}
                      aria-label="Increase small quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Single Size - NO SIZE LABEL, just quantity controls */
              <div className="size-option single-size-option">
                <div className="size-info">
                  <span className="size-price">${item.price.toFixed(2)}</span>
                </div>
                <div className="quantity-controls">
                  <button
                    className="quantity-btn minus-btn"
                    onClick={() => updateQuantity("single", -1)}
                    disabled={quantities.single === 0}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="quantity-display">{quantities.single}</span>
                  <button
                    className="quantity-btn plus-btn"
                    onClick={() => updateQuantity("single", 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div className="special-instructions-section">
            <label
              htmlFor="special-instructions"
              className="special-instructions-label"
            >
              Special Instructions
            </label>
            <textarea
              id="special-instructions"
              className="special-instructions-textarea"
              placeholder="Add a note (e.g. allergies, etc)"
              value={specialInstructions}
              onChange={handleInstructionsChange}
              maxLength={MAX_INSTRUCTIONS_LENGTH}
            />
            <div className="character-count">
              {specialInstructions.length}/{MAX_INSTRUCTIONS_LENGTH} characters
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="no-selection-message">
              <p>{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="popup-actions">
            <button
              className="cancel-popup-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              className="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={loading || !hasSelection}
            >
              {loading ? (
                <span className="popup-loading">
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
                  Adding...
                </span>
              ) : (
                <>
                  Add to Cart
                  <span className="btn-total-price">
                    ${totalPrice.toFixed(2)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemPopup;
