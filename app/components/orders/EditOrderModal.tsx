// app/components/orders/EditOrderModal.tsx
import { useState, useEffect, useRef } from "react";
import { getMenuData } from "../../services/menuService";
import { updateOrderItems } from "../../services/orderService";
import { emailService } from "../../services/emailService";
import { getOrderById } from "../../services/orderService";
import AdminDishPopup from "./AdminDishPopup";
import type {
  Order,
  OrderItem,
  MenuItem,
  MenuCategory,
} from "../../types/types";
import "../../styles/editOrderModal.css";

interface OrderLineItem {
  menuItemId: string;
  dishName: string;
  category: string;
  size: string;
  price: number;
  quantity: number;
  originalQuantity: number; // quantity at modal open; 0 for brand-new items
}

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

function lineItemsFromOrder(order: Order): OrderLineItem[] {
  const lines: OrderLineItem[] = [];
  for (const item of order.items) {
    for (const q of item.quantities) {
      lines.push({
        menuItemId: item.menuItemId,
        dishName: item.dishName,
        category: item.category,
        size: q.size,
        price: q.price,
        quantity: q.quantity,
        originalQuantity: q.quantity,
      });
    }
  }
  return lines;
}

function lineItemsToOrderItems(lines: OrderLineItem[]): OrderItem[] {
  const map = new Map<string, OrderItem>();
  for (const li of lines) {
    // Custom items each get a unique key so they never merge with each other
    const key =
      li.menuItemId === "custom"
        ? `custom-${li.dishName}-${li.size}`
        : li.menuItemId;
    const existing = map.get(key);
    if (existing) {
      existing.quantities.push({
        size: li.size,
        price: li.price,
        quantity: li.quantity,
      });
      existing.itemSubtotal += li.price * li.quantity;
    } else {
      map.set(key, {
        menuItemId: li.menuItemId,
        dishName: li.dishName,
        category: li.category,
        quantities: [{ size: li.size, price: li.price, quantity: li.quantity }],
        itemSubtotal: li.price * li.quantity,
      });
    }
  }
  return Array.from(map.values());
}

export default function EditOrderModal({
  order,
  onClose,
  onSuccess,
}: EditOrderModalProps) {
  const [lineItems, setLineItems] = useState<OrderLineItem[]>(() =>
    lineItemsFromOrder(order),
  );
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Custom item form state
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customError, setCustomError] = useState<string | null>(null);

  const discountPercent = order.discountPercent ?? 0;
  const hasDiscount = discountPercent > 0;
  const hasUnadjusted = lineItems.some(
    (li) => li.quantity > li.originalQuantity,
  );

  useEffect(() => {
    getMenuData()
      .then(({ items, categories }) => {
        setAllItems(items.filter((i) => i.available));
        setCategories(categories);
      })
      .catch((err) => console.error("Failed to load menu:", err));
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    setSearchResults(allItems.filter((i) => i.name.toLowerCase().includes(q)));
    setShowDropdown(true);
  }, [searchQuery, allItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasTwoSizes = (item: MenuItem): boolean => {
    const cat = categories.find((c) => c.name === item.category);
    return !!(cat?.hasTwoSizes && item.secondPrice && item.secondPrice > 0);
  };

  const handleAddToOrder = (
    dish: MenuItem,
    size: string,
    price: number,
    quantity: number,
  ) => {
    setLineItems((prev) => {
      const idx = prev.findIndex(
        (li) => li.menuItemId === dish.id && li.size === size,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + quantity,
        };
        return updated;
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          dishName: dish.name,
          category: dish.category,
          size,
          price,
          quantity,
          originalQuantity: 0,
        },
      ];
    });
  };

  const handleAddCustomItem = () => {
    setCustomError(null);
    const name = customName.trim();
    const price = parseFloat(customPrice);
    const qty = parseInt(customQty, 10);

    if (!name) {
      setCustomError("Item name is required.");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setCustomError("Enter a valid price greater than 0.");
      return;
    }
    if (isNaN(qty) || qty < 1) {
      setCustomError("Enter a valid quantity of at least 1.");
      return;
    }

    setLineItems((prev) => [
      ...prev,
      {
        menuItemId: "custom",
        dishName: name,
        category: "Custom",
        size: "single",
        price,
        quantity: qty,
        originalQuantity: 0,
      },
    ]);

    // Reset form
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
  };

  const handleRemoveLine = (index: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleUpdateQty = (index: number, delta: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const handleApplyDiscount = () => {
    const multiplier = 1 - discountPercent / 100;
    setLineItems((prev) =>
      prev.map((li) => {
        const delta = li.quantity - li.originalQuantity;
        if (delta <= 0) return li;

        const discountedDeltaPrice = parseFloat(
          (li.price * multiplier).toFixed(2),
        );
        const totalCost =
          li.originalQuantity * li.price + delta * discountedDeltaPrice;
        const blendedPrice = parseFloat((totalCost / li.quantity).toFixed(2));

        return {
          ...li,
          price: blendedPrice,
          originalQuantity: li.quantity,
        };
      }),
    );
  };

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0,
  );

  const handleSave = async () => {
    if (lineItems.length === 0) {
      setError("Order must have at least one item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updatedItems = lineItemsToOrderItems(lineItems);
      await updateOrderItems(order.id, updatedItems, subtotal);
      const updatedOrder = await getOrderById(order.id);
      if (updatedOrder) {
        await emailService.sendOrderUpdatedToCustomer(updatedOrder);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save order edits:", err);
      setError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eom-overlay" onClick={onClose}>
      <div className="eom-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eom-header">
          <div className="eom-header-text">
            <h2 className="eom-title">Edit Order</h2>
            <span className="eom-code">
              {order.orderCode} — {order.customerName}
            </span>
          </div>
          <button className="eom-close" onClick={onClose} aria-label="Close">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="eom-body">
          {/* Menu item search */}
          <div className="eom-search-section">
            <p className="eom-section-label">Add Menu Item</p>
            <div className="eom-search-wrapper" ref={searchRef}>
              <input
                className="eom-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items…"
              />
              {showDropdown && (
                <ul className="eom-search-dropdown">
                  {searchResults.length === 0 ? (
                    <li className="eom-search-empty">No items found.</li>
                  ) : (
                    searchResults.map((item) => (
                      <li
                        key={item.id}
                        className="eom-search-result"
                        onClick={() => {
                          setSearchQuery("");
                          setShowDropdown(false);
                          setSelectedDish(item);
                        }}
                      >
                        <span className="eom-result-name">{item.name}</span>
                        <span className="eom-result-category">
                          {item.category}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Custom item form */}
          <div className="eom-custom-section">
            <p className="eom-section-label">Add Custom Item</p>
            <div className="eom-custom-form">
              <input
                className="eom-custom-input eom-custom-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Item name"
                maxLength={120}
              />
              <input
                className="eom-custom-input eom-custom-price"
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Price ($)"
                min="0.01"
                step="0.01"
              />
              <input
                className="eom-custom-input eom-custom-qty"
                type="number"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                placeholder="Qty"
                min="1"
                step="1"
              />
              <button
                className="eom-custom-add-btn"
                onClick={handleAddCustomItem}
              >
                Add
              </button>
            </div>
            {customError && <p className="eom-custom-error">{customError}</p>}
          </div>

          {/* Line items */}
          <div className="eom-items-section">
            <p className="eom-section-label">Order Items</p>
            {lineItems.length === 0 ? (
              <p className="eom-empty">
                No items. Add at least one dish above.
              </p>
            ) : (
              <div className="eom-lines">
                <div className="eom-lines-header">
                  <span>Item</span>
                  <span>Size</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span></span>
                </div>
                {lineItems.map((li, i) => (
                  <div
                    key={i}
                    className={`eom-line${hasDiscount && li.quantity > li.originalQuantity ? " eom-line-unadjusted" : ""}${li.menuItemId === "custom" ? " eom-line-custom" : ""}`}
                  >
                    <span className="eom-line-name">
                      {li.dishName}
                      {li.menuItemId === "custom" && (
                        <span className="eom-custom-badge">Custom</span>
                      )}
                    </span>
                    <span className="eom-line-size">
                      {li.menuItemId === "custom"
                        ? "—"
                        : li.size.charAt(0).toUpperCase() + li.size.slice(1)}
                    </span>
                    <div className="eom-line-qty">
                      <button
                        className="eom-qty-btn"
                        onClick={() => handleUpdateQty(i, -1)}
                      >
                        −
                      </button>
                      <span>{li.quantity}</span>
                      <button
                        className="eom-qty-btn"
                        onClick={() => handleUpdateQty(i, 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="eom-line-price">
                      ${(li.price * li.quantity).toFixed(2)}
                    </span>
                    <button
                      className="eom-line-remove"
                      onClick={() => handleRemoveLine(i)}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="eom-subtotal">
                  <span>New Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Discount adjustment button */}
          {hasDiscount && (
            <div className="eom-discount-row">
              <button
                className="eom-discount-btn"
                onClick={handleApplyDiscount}
                disabled={!hasUnadjusted}
                title={
                  hasUnadjusted
                    ? `Apply ${discountPercent}% discount to new items`
                    : "No new items to adjust"
                }
              >
                Apply {discountPercent}% discount to new items
              </button>
              {hasUnadjusted && (
                <span className="eom-discount-hint">
                  New items are at full price — click to apply the order
                  discount.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="eom-footer">
          {error && <p className="eom-error">{error}</p>}
          <button
            className="eom-cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="eom-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save & Notify Customer"}
          </button>
        </div>
      </div>

      {selectedDish && (
        <AdminDishPopup
          item={selectedDish}
          hasTwoSizes={hasTwoSizes(selectedDish)}
          onAdd={(size, price, qty) =>
            handleAddToOrder(selectedDish, size, price, qty)
          }
          onClose={() => setSelectedDish(null)}
        />
      )}
    </div>
  );
}
