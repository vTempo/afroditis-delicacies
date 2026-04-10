// app/components/orders/AdminOrderForm.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/authContext/authContext";
import AddressAutocomplete from "../addressAutocomplete/AddressAutocomplete";
import DeliveryScheduler from "../checkout/DeliveryScheduler";
import AdminDishPopup from "./AdminDishPopup";
import {
  placeOrder,
  subscribeToBlockedDays,
} from "../../services/orderService";
import { getMenuData } from "../../services/menuService";
import type { AddressDetails } from "../../services/addressService";
import type { MenuItem, MenuCategory, OrderItem } from "../../types/types";
import {
  sanitizeText,
  isValidEmail,
  isValidPhone,
  MAX_LENGTHS,
} from "../../utils/sanitize";
import "../../styles/adminOrderForm.css";
import "../../styles/deliveryScheduler.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const BOTHELL_LAT = 47.7623;
const BOTHELL_LNG = -122.2054;
const MAX_DELIVERY_MILES = 25;

function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

// Regular menu item line
interface MenuOrderLineItem {
  type: "menu";
  menuItem: MenuItem;
  size: string;
  basePrice: number; // full menu price, never changes
  price: number; // displayed/saved price = basePrice * discount multiplier
  quantity: number;
}

// Custom off-menu item line
interface CustomOrderLineItem {
  type: "custom";
  dishName: string;
  basePrice: number; // what admin typed, never changes
  price: number; // displayed/saved price = basePrice * discount multiplier
  quantity: number;
}

type OrderLineItem = MenuOrderLineItem | CustomOrderLineItem;

interface AdminOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminOrderForm({
  onClose,
  onSuccess,
}: AdminOrderFormProps) {
  const { user } = useAuth();

  // ── Customer fields ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ── Address ──
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(
    null,
  );
  const [addressInputValue, setAddressInputValue] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressValidating, setAddressValidating] = useState(false);

  // ── Calendar ──
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ── Menu search ──
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Order lines ──
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);

  // ── Discount ──
  const [discountPercent, setDiscountPercent] = useState<string>("");

  // ── Custom item form ──
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customError, setCustomError] = useState<string | null>(null);

  // ── Submission ──
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Discount multiplier helper ──
  const getMultiplier = (val: string): number => {
    const p = parseFloat(val);
    return !isNaN(p) && p > 0 && p < 100 ? 1 - p / 100 : 1;
  };

  // ── Load menu on mount ──
  useEffect(() => {
    getMenuData()
      .then(({ items, categories }) => {
        setAllItems(items.filter((i) => i.available));
        setCategories(categories);
      })
      .catch((err) => console.error("Failed to load menu:", err));
  }, []);

  // ── Search filtering ──
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

  // ── Click outside to close dropdown ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Address handler ──
  const handleAddressSelect = async (addr: AddressDetails) => {
    setAddressDetails(addr);
    setAddressInputValue(addr.formattedAddress);
    setAddressError(null);
    setAddressValidating(true);
    try {
      const coords = await geocodeAddress(addr.formattedAddress);
      if (!coords) {
        setAddressError("Could not verify this address. Please try again.");
        setAddressDetails(null);
        return;
      }
      const miles = distanceMiles(
        coords.lat,
        coords.lng,
        BOTHELL_LAT,
        BOTHELL_LNG,
      );
      if (miles > MAX_DELIVERY_MILES) {
        setAddressError("Sorry, this address is not within our delivery area.");
        setAddressDetails(null);
      }
    } catch {
      setAddressError("Address validation failed. Please try again.");
      setAddressDetails(null);
    } finally {
      setAddressValidating(false);
    }
  };

  // ── Calendar handlers ──
  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else setCalendarMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else setCalendarMonth((m) => m + 1);
  };

  const handleDayClick = (day: Date) => setSelectedDate(day);

  // ── Discount change — retroactively reprices all existing items from basePrice ──
  const handleDiscountChange = (val: string) => {
    setDiscountPercent(val);
    const multiplier = getMultiplier(val);
    setLineItems((prev) =>
      prev.map((li) => ({
        ...li,
        price: parseFloat((li.basePrice * multiplier).toFixed(2)),
      })),
    );
  };

  // ── Order line handlers ──
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
    const multiplier = getMultiplier(discountPercent);
    const discountedPrice = parseFloat((price * multiplier).toFixed(2));
    setLineItems((prev) => {
      const idx = prev.findIndex(
        (li) =>
          li.type === "menu" && li.menuItem.id === dish.id && li.size === size,
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
          type: "menu",
          menuItem: dish,
          size,
          basePrice: price,
          price: discountedPrice,
          quantity,
        },
      ];
    });
  };

  const handleAddCustomItem = () => {
    setCustomError(null);
    const name = customName.trim();
    const basePrice = parseFloat(customPrice);
    const qty = parseInt(customQty, 10);

    if (!name) {
      setCustomError("Item name is required.");
      return;
    }
    if (isNaN(basePrice) || basePrice <= 0) {
      setCustomError("Enter a valid price greater than 0.");
      return;
    }
    if (isNaN(qty) || qty < 1) {
      setCustomError("Enter a valid quantity of at least 1.");
      return;
    }

    const multiplier = getMultiplier(discountPercent);
    const discountedPrice = parseFloat((basePrice * multiplier).toFixed(2));

    setLineItems((prev) => [
      ...prev,
      {
        type: "custom",
        dishName: name,
        basePrice,
        price: discountedPrice,
        quantity: qty,
      },
    ]);

    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
  };

  const handleRemoveLine = (index: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleUpdateLineQty = (index: number, delta: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const orderSubtotal = lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0,
  );

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError("Please enter the customer's full name.");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setSubmitError("Please enter a valid 10-digit US phone number.");
      return;
    }
    if (!addressDetails) {
      setSubmitError("Please select a valid delivery address.");
      return;
    }
    if (addressError) {
      setSubmitError("The delivery address is outside our service area.");
      return;
    }
    if (!selectedDate) {
      setSubmitError("Please select a delivery date.");
      return;
    }
    if (lineItems.length === 0) {
      setSubmitError("Please add at least one item to the order.");
      return;
    }

    setSubmitting(true);
    try {
      const itemsMap = new Map<string, OrderItem>();

      lineItems.forEach((li) => {
        if (li.type === "menu") {
          const existing = itemsMap.get(li.menuItem.id);
          if (existing) {
            existing.quantities.push({
              size: li.size,
              price: li.price,
              quantity: li.quantity,
            });
            existing.itemSubtotal += li.price * li.quantity;
          } else {
            itemsMap.set(li.menuItem.id, {
              menuItemId: li.menuItem.id,
              dishName: li.menuItem.name,
              category: li.menuItem.category,
              imageUrl: li.menuItem.imgPath,
              quantities: [
                { size: li.size, price: li.price, quantity: li.quantity },
              ],
              itemSubtotal: li.price * li.quantity,
            });
          }
        } else {
          const key = `custom-${li.dishName}`;
          itemsMap.set(key, {
            menuItemId: "custom",
            dishName: li.dishName,
            category: "Custom",
            quantities: [
              { size: "single", price: li.price, quantity: li.quantity },
            ],
            itemSubtotal: li.price * li.quantity,
          });
        }
      });

      const parsedDiscount = parseFloat(discountPercent);
      const validDiscount =
        !isNaN(parsedDiscount) && parsedDiscount > 0 && parsedDiscount < 100
          ? parsedDiscount
          : undefined;

      await placeOrder({
        userId: user!.uid,
        customerName: `${sanitizeText(firstName, MAX_LENGTHS.name)} ${sanitizeText(lastName, MAX_LENGTHS.name)}`,
        customerEmail: sanitizeText(email, MAX_LENGTHS.email),
        customerPhone: sanitizeText(phone, MAX_LENGTHS.phone),
        items: Array.from(itemsMap.values()),
        subtotal: orderSubtotal,
        paymentMethod: "pay_on_delivery",
        deliveryAddress: {
          street: addressDetails.street,
          city: addressDetails.city,
          state: addressDetails.state,
          zipCode: addressDetails.zipCode,
          fullAddress: addressDetails.formattedAddress,
        },
        deliveryDate: selectedDate,
        deliveryTime: "",
        initialStatus: "active",
        discountPercent: validDiscount,
      });

      setSubmitSuccess(true);
    } catch (error: any) {
      console.error("Admin order error:", error);
      setSubmitError(
        error.message || "Failed to place order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (submitSuccess) {
    return (
      <div className="aof-overlay">
        <div className="aof-success">
          <svg
            className="aof-success-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2>Order Created</h2>
          <p>The order has been placed and is pending review.</p>
          <button className="aof-success-close" onClick={onSuccess}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="aof-overlay">
      <div className="aof-container">
        {/* Header */}
        <div className="aof-header">
          <h2 className="aof-title">New Order</h2>
          <button
            className="aof-close-btn"
            onClick={onClose}
            aria-label="Close"
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

        <div className="aof-body">
          {/* ── LEFT — Customer & Delivery ── */}
          <div className="aof-left">
            <section className="aof-section">
              <h3 className="aof-section-title">Customer Information</h3>
              <div className="aof-form-row">
                <div className="aof-field">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    maxLength={MAX_LENGTHS.name}
                  />
                </div>
                <div className="aof-field">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    maxLength={MAX_LENGTHS.name}
                  />
                </div>
              </div>
              <div className="aof-form-row">
                <div className="aof-field">
                  <label>
                    Email <span className="aof-optional">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    maxLength={MAX_LENGTHS.email}
                  />
                </div>
                <div className="aof-field">
                  <label>
                    Phone <span className="aof-optional">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    maxLength={MAX_LENGTHS.phone}
                  />
                </div>
              </div>
            </section>

            <section className="aof-section">
              <h3 className="aof-section-title">Delivery Address</h3>
              <p className="aof-section-note">
                Must be within 25 miles of Bothell, WA.
              </p>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                initialValue={addressInputValue}
                placeholder="Start typing the delivery address…"
                mapboxToken={MAPBOX_TOKEN}
              />
              {addressValidating && (
                <p className="aof-validating">Validating address…</p>
              )}
              {addressDetails && !addressError && (
                <div className="aof-address-confirmed">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {addressDetails.formattedAddress}
                </div>
              )}
              {addressError && (
                <p className="aof-field-error">{addressError}</p>
              )}
            </section>

            <DeliveryScheduler
              totalItems={0}
              earliestDate={new Date(0)}
              blockedDays={[]}
              bookedTimes={[]}
              timesLoading={false}
              calendarYear={calendarYear}
              calendarMonth={calendarMonth}
              selectedDate={selectedDate}
              selectedTime={null}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onDayClick={handleDayClick}
              onTimeSelect={() => {}}
              hideTimeSlots
            />
          </div>

          {/* ── RIGHT — Order Builder ── */}
          <div className="aof-right">
            {/* Discount */}
            <section className="aof-section">
              <h3 className="aof-section-title">
                Discount <span className="aof-optional">(optional)</span>
              </h3>
              <div className="aof-discount-row">
                <p className="aof-section-note">
                  All items will be priced at the discounted rate.
                </p>
                <div className="aof-discount-input-row">
                  <input
                    className="aof-custom-input aof-discount-input"
                    type="number"
                    value={discountPercent}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="e.g. 10"
                    min="0"
                    max="99"
                    step="1"
                  />
                  <span className="aof-discount-symbol">%</span>
                </div>
              </div>
            </section>

            {/* Menu item search */}
            <section className="aof-section">
              <h3 className="aof-section-title">Add Menu Item</h3>
              <div className="aof-search-wrapper" ref={searchRef}>
                <input
                  className="aof-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items…"
                />
                {showDropdown && (
                  <ul className="aof-search-dropdown">
                    {searchResults.length === 0 ? (
                      <li className="aof-search-empty">No items found.</li>
                    ) : (
                      searchResults.map((item) => (
                        <li
                          key={item.id}
                          className="aof-search-result"
                          onClick={() => {
                            setSearchQuery("");
                            setShowDropdown(false);
                            setSelectedDish(item);
                          }}
                        >
                          <span className="aof-result-name">{item.name}</span>
                          <span className="aof-result-category">
                            {item.category}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </section>

            {/* Custom item form */}
            <section className="aof-section">
              <h3 className="aof-section-title">Add Custom Item</h3>
              <div className="aof-custom-form">
                <input
                  className="aof-custom-input aof-custom-name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Item name"
                  maxLength={120}
                />
                <input
                  className="aof-custom-input aof-custom-price"
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Price ($)"
                  min="0.01"
                  step="0.01"
                />
                <input
                  className="aof-custom-input aof-custom-qty"
                  type="number"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="Qty"
                  min="1"
                  step="1"
                />
                <button
                  className="aof-custom-add-btn"
                  onClick={handleAddCustomItem}
                >
                  Add
                </button>
              </div>
              {customError && <p className="aof-custom-error">{customError}</p>}
            </section>

            {/* Order lines */}
            <section className="aof-section">
              <h3 className="aof-section-title">Order Items</h3>
              {lineItems.length === 0 ? (
                <p className="aof-empty-order">
                  No items added yet. Search above to add dishes.
                </p>
              ) : (
                <div className="aof-order-lines">
                  <div className="aof-order-lines-header">
                    <span>Item</span>
                    <span>Size</span>
                    <span>Qty</span>
                    <span>Price</span>
                    <span></span>
                  </div>
                  {lineItems.map((li, i) => (
                    <div
                      key={i}
                      className={`aof-order-line${li.type === "custom" ? " aof-order-line-custom" : ""}`}
                    >
                      <span className="aof-line-name">
                        {li.type === "menu" ? li.menuItem.name : li.dishName}
                        {li.type === "custom" && (
                          <span className="aof-custom-badge">Custom</span>
                        )}
                      </span>
                      <span className="aof-line-size">
                        {li.type === "menu"
                          ? li.size.charAt(0).toUpperCase() + li.size.slice(1)
                          : "—"}
                      </span>
                      <div className="aof-line-qty">
                        <button
                          className="aof-line-qty-btn"
                          onClick={() => handleUpdateLineQty(i, -1)}
                        >
                          −
                        </button>
                        <span>{li.quantity}</span>
                        <button
                          className="aof-line-qty-btn"
                          onClick={() => handleUpdateLineQty(i, 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="aof-line-price">
                        ${(li.price * li.quantity).toFixed(2)}
                      </span>
                      <button
                        className="aof-line-remove"
                        onClick={() => handleRemoveLine(i)}
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="aof-order-total">
                    <span>Subtotal</span>
                    <span>${orderSubtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </section>

            <div className="aof-submit-area">
              {submitError && <p className="aof-submit-error">{submitError}</p>}
              <button
                className="aof-submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Placing Order…" : "Place Order"}
              </button>
            </div>
          </div>
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
