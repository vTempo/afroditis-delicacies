import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import Header from "../components/utils/header";
import Footer from "../components/utils/footer";
import AddressAutocomplete from "../components/addressAutocomplete/AddressAutocomplete";
import { useAuth } from "../context/authContext/authContext";
import { useUserProfile } from "../context/userContext/userProfile";
import { useCart } from "../context/cartContext/cartContext";
import {
  placeOrder,
  getBookedTimesForDate,
  reserveTimeSlot,
  releaseReservation,
  subscribeToBlockedDays,
} from "../services/orderService";
import { emailService } from "../services/emailService";
import { addressService } from "../services/addressService";
import type { AddressDetails } from "../services/addressService";
import type { OrderItem, PaymentMethod } from "../types/types";
import "../styles/checkout.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Bothell, WA coordinates
const BOTHELL_LAT = 47.7623;
const BOTHELL_LNG = -122.2054;
const MAX_DELIVERY_MILES = 50;

// Time slots: 10am–10pm in 30-min increments
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h < 22; h++) {
    const ampm = h < 12 ? "AM" : "PM";
    const hour = h <= 12 ? h : h - 12;
    slots.push(`${hour}:00 ${ampm}`);
    slots.push(`${hour}:30 ${ampm}`);
  }
  slots.push("10:00 PM");
  return slots;
}

const ALL_TIME_SLOTS = generateTimeSlots();

// Convert "2:30 PM" → minutes since midnight for comparison
function timeToMinutes(time: string): number {
  const [timePart, ampm] = time.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hours = h;
  if (ampm === "PM" && h !== 12) hours += 12;
  if (ampm === "AM" && h === 12) hours = 0;
  return hours * 60 + m;
}

// Is a slot within ±60 minutes of any booked time?
function isWithinBuffer(slot: string, times: string[]): boolean {
  const slotMins = timeToMinutes(slot);
  return times.some((t) => Math.abs(slotMins - timeToMinutes(t)) < 60);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Haversine distance in miles between two lat/lng points
function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode an address string → {lat, lng} using Mapbox
async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      return { lat: coords[1], lng: coords[0] };
    }
    return null;
  } catch {
    return null;
  }
}

// Earliest available delivery date based on total item count
function getEarliestDeliveryDate(totalItems: number): Date {
  const now = new Date();
  let hoursToAdd = 24;
  if (totalItems >= 4 && totalItems <= 6) hoursToAdd = 72;
  if (totalItems >= 7) hoursToAdd = 120;
  const earliest = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  earliest.setHours(0, 0, 0, 0);
  return earliest;
}

// Build a calendar grid for a given month
function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useUserProfile();
  const { cartItems, cartTotal, clearCart } = useCart();

  // ── Redirect if not logged in or cart is empty ──
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // ── Form fields ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(
    null,
  );
  const [addressInputValue, setAddressInputValue] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressValidating, setAddressValidating] = useState(false);

  // ── Calendar state ──
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [reservedTimes, setReservedTimes] = useState<string[]>([]);
  const reservationIdRef = useRef<string | null>(null);
  const reservationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [timesLoading, setTimesLoading] = useState(false);

  // ── Payment ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  // ── Address mode ──
  const hasProfileAddress = !!profile?.address?.street;
  const [addressMode, setAddressMode] = useState<"profile" | "custom">(
    "profile",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // ── Autofill from profile ──
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setPhone(profile.phoneNumber || "");
    }
    if (user?.email) {
      setEmail(user.email);
    }
    if (profile?.address?.street) {
      const addr = profile.address;
      const formatted = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
      setAddressInputValue(formatted);
      setAddressDetails({
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country || "United States",
        formattedAddress: formatted,
      });
      setAddressMode("profile");
    }
  }, [profile, user]);

  // ── Total item count (for lead-time rule) ──
  const totalItems = cartItems.reduce(
    (sum, item) => sum + item.quantities.reduce((s, q) => s + q.quantity, 0),
    0,
  );

  const earliestDate = getEarliestDeliveryDate(totalItems);

  // ── Load booked times when date changes ──
  useEffect(() => {
    if (!selectedDate) {
      setBookedTimes([]);
      setReservedTimes([]);
      return;
    }
    let cancelled = false;
    setTimesLoading(true);
    getBookedTimesForDate(selectedDate, user?.uid).then(
      ({ booked, reserved }) => {
        if (!cancelled) {
          setBookedTimes(booked);
          setReservedTimes(reserved);
          setTimesLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectedDate, user?.uid]);

  useEffect(() => {
    return () => {
      if (reservationIdRef.current)
        releaseReservation(reservationIdRef.current);
      if (reservationTimeoutRef.current)
        clearTimeout(reservationTimeoutRef.current);
    };
  }, []);

  // ── Countdown after success ──
  useEffect(() => {
    if (!orderSuccess) return;
    if (countdown <= 0) {
      navigate("/");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [orderSuccess, countdown, navigate]);

  useEffect(() => {
    const unsub = subscribeToBlockedDays(setBlockedDays);
    return () => unsub();
  }, []);

  const handleAddressModeChange = (mode: "profile" | "custom") => {
    setAddressMode(mode);
    if (mode === "profile" && profile?.address?.street) {
      const addr = profile.address;
      const formatted = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
      setAddressInputValue(formatted);
      setAddressDetails({
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country || "United States",
        formattedAddress: formatted,
      });
      setAddressError(null);
    } else {
      setAddressInputValue("");
      setAddressDetails(null);
      setAddressError(null);
    }
  };

  // ── Address validation (50-mile check) ──
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
        setAddressError(
          `Sorry, this address is ${Math.round(miles)} miles from Bothell, WA. We only deliver within ${MAX_DELIVERY_MILES} miles.`,
        );
        setAddressDetails(null);
      }
    } catch {
      setAddressError("Address validation failed. Please try again.");
      setAddressDetails(null);
    } finally {
      setAddressValidating(false);
    }
  };

  // ── Calendar helpers ──
  const calendarDays = buildCalendarDays(calendarYear, calendarMonth);

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const isDayAvailable = (day: Date): boolean => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    if (d < earliestDate) return false;
    if (blockedDays.includes(dateKey(d))) return false;
    return true;
  };

  const isDaySelected = (day: Date): boolean => {
    if (!selectedDate) return false;
    return (
      day.getFullYear() === selectedDate.getFullYear() &&
      day.getMonth() === selectedDate.getMonth() &&
      day.getDate() === selectedDate.getDate()
    );
  };

  const handleDayClick = async (day: Date) => {
    if (!isDayAvailable(day)) return;
    if (reservationIdRef.current) {
      await releaseReservation(reservationIdRef.current);
      reservationIdRef.current = null;
    }
    if (reservationTimeoutRef.current)
      clearTimeout(reservationTimeoutRef.current);
    setSelectedDate(day);
    setSelectedTime(null);
  };

  const handleTimeSelect = async (slot: string) => {
    if (!selectedDate || !user) return;
    if (reservationIdRef.current) {
      await releaseReservation(reservationIdRef.current);
      reservationIdRef.current = null;
    }
    if (reservationTimeoutRef.current)
      clearTimeout(reservationTimeoutRef.current);
    setSelectedTime(slot);
    try {
      const resId = await reserveTimeSlot(selectedDate, slot, user.uid);
      reservationIdRef.current = resId;
      reservationTimeoutRef.current = setTimeout(
        async () => {
          reservationIdRef.current = null;
          setSelectedTime(null);
          if (selectedDate) {
            const { booked, reserved } = await getBookedTimesForDate(
              selectedDate,
              user?.uid,
            );
            setBookedTimes(booked);
            setReservedTimes(reserved);
          }
        },
        15 * 60 * 1000,
      );
    } catch (err) {
      console.error("Failed to reserve time slot:", err);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setSubmitError("Please enter your email address.");
      return;
    }
    if (!phone.trim()) {
      setSubmitError("Please enter your phone number.");
      return;
    }
    if (!addressDetails) {
      setSubmitError("Please select a valid delivery address.");
      return;
    }
    if (addressError) {
      setSubmitError("Your delivery address is outside our service area.");
      return;
    }
    if (!selectedDate) {
      setSubmitError("Please select a delivery date.");
      return;
    }
    if (!selectedTime) {
      setSubmitError("Please select a delivery time.");
      return;
    }
    if (!paymentMethod) {
      setSubmitError("Please select a payment method.");
      return;
    }
    if (cartItems.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }

    const { booked } = await getBookedTimesForDate(selectedDate, user?.uid);
    if (isWithinBuffer(selectedTime, booked)) {
      setSubmitError(
        "This time slot was just taken. Please choose a different time.",
      );
      setSelectedTime(null);
      setBookedTimes(booked);
      return;
    }
    setSubmitting(true);

    try {
      // Build order items from cart
      const items: OrderItem[] = cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        dishName: item.dishName,
        category: item.category,
        imageUrl: item.imageUrl,
        quantities: item.quantities,
        specialInstructions: item.specialInstructions,
        itemSubtotal: item.quantities.reduce(
          (s, q) => s + q.price * q.quantity,
          0,
        ),
      }));

      const orderId = await placeOrder({
        userId: user!.uid,
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items,
        subtotal: cartTotal,
        paymentMethod,
        deliveryAddress: {
          street: addressDetails.street,
          city: addressDetails.city,
          state: addressDetails.state,
          zipCode: addressDetails.zipCode,
          fullAddress: addressDetails.formattedAddress,
        },
        deliveryDate: selectedDate,
        deliveryTime: selectedTime,
      });

      // Fetch the created order to pass to email functions
      const { getOrderById } = await import("../services/orderService");
      const order = await getOrderById(orderId);

      if (order) {
        await emailService.sendOrderConfirmationToCustomer(order);
        await emailService.sendNewOrderNotificationToAdmin(order);
      }

      if (reservationIdRef.current) {
        await releaseReservation(reservationIdRef.current);
        reservationIdRef.current = null;
      }
      // Clear cart
      await clearCart();

      // Show success screen
      setOrderSuccess(true);
    } catch (error: any) {
      console.error("Order submission error:", error);
      setSubmitError(
        error.message || "Failed to place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="checkout-success-page">
          <div className="checkout-success-box">
            <div className="success-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1>Thank You for Your Order!</h1>
            <p>
              Your order has been placed and is <strong>pending review</strong>.
              We'll send you an email once it's been approved.
            </p>
            <p className="success-redirect">
              Redirecting to home in <strong>{countdown}</strong> seconds…
            </p>
            <button className="success-home-btn" onClick={() => navigate("/")}>
              Go Home Now
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="checkout-page">
        <div className="checkout-container">
          <h1 className="checkout-title">Checkout</h1>

          <div className="checkout-layout">
            {/* ── LEFT COLUMN ── */}
            <div className="checkout-left">
              {/* Contact Info */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Contact Information</h2>
                <div className="checkout-form-row">
                  <div className="checkout-field">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Eleni"
                    />
                  </div>
                  <div className="checkout-field">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Papadopoulos"
                    />
                  </div>
                </div>
                <div className="checkout-form-row">
                  <div className="checkout-field">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="checkout-field">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(206) 555-0123"
                    />
                  </div>
                </div>
              </section>

              {/* Delivery Address */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Delivery Address</h2>
                <p className="checkout-section-note">
                  Must be within 50 miles of Bothell, WA.
                </p>

                {hasProfileAddress && (
                  <div className="address-mode-toggle">
                    <label className="address-radio-label">
                      <input
                        type="radio"
                        name="addressMode"
                        value="profile"
                        checked={addressMode === "profile"}
                        onChange={() => handleAddressModeChange("profile")}
                      />
                      <span>Use my saved address</span>
                    </label>
                    <label className="address-radio-label">
                      <input
                        type="radio"
                        name="addressMode"
                        value="custom"
                        checked={addressMode === "custom"}
                        onChange={() => handleAddressModeChange("custom")}
                      />
                      <span>Deliver to a different address</span>
                    </label>
                  </div>
                )}

                {addressMode === "profile" && hasProfileAddress ? (
                  <div className="address-confirmed">
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
                    {addressDetails?.formattedAddress}
                  </div>
                ) : (
                  <>
                    <AddressAutocomplete
                      onAddressSelect={handleAddressSelect}
                      initialValue={addressInputValue}
                      placeholder="Start typing your delivery address…"
                      mapboxToken={MAPBOX_TOKEN}
                    />
                    {addressValidating && (
                      <p className="address-validating">Validating address…</p>
                    )}
                    {addressDetails && !addressError && (
                      <div className="address-confirmed">
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
                  </>
                )}

                {addressError && (
                  <p className="checkout-field-error">{addressError}</p>
                )}
              </section>

              {/* Delivery Date & Time */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Delivery Date & Time</h2>
                <p className="checkout-section-note">
                  {totalItems <= 3 && "Minimum 24 hours notice required."}
                  {totalItems >= 4 &&
                    totalItems <= 6 &&
                    "Minimum 72 hours notice required."}
                  {totalItems >= 7 && "Minimum 5 days notice required."}
                </p>

                {/* Calendar */}
                <div className="calendar-wrapper">
                  <div className="calendar-nav">
                    <button onClick={prevMonth} className="calendar-nav-btn">
                      ‹
                    </button>
                    <span className="calendar-month-label">
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </span>
                    <button onClick={nextMonth} className="calendar-nav-btn">
                      ›
                    </button>
                  </div>

                  <div className="calendar-grid">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className="calendar-day-name">
                        {d}
                      </div>
                    ))}
                    {calendarDays.map((day, i) => {
                      if (!day) return <div key={`empty-${i}`} />;
                      const available = isDayAvailable(day);
                      const selected = isDaySelected(day);
                      return (
                        <button
                          key={day.toISOString()}
                          className={`calendar-day ${available ? "available" : "unavailable"} ${selected ? "selected" : ""}`}
                          onClick={() => handleDayClick(day)}
                          disabled={!available}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="time-slots-wrapper">
                    <p className="time-slots-label">
                      Select delivery time on{" "}
                      <strong>
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                      :
                    </p>
                    {timesLoading ? (
                      <p className="times-loading">Loading available times…</p>
                    ) : (
                      <>
                        <div className="time-slots-grid">
                          {ALL_TIME_SLOTS.map((slot) => {
                            const blocked =
                              isWithinBuffer(slot, bookedTimes) ||
                              isWithinBuffer(slot, reservedTimes);
                            const isSelected = selectedTime === slot;
                            return (
                              <button
                                key={slot}
                                className={`time-slot ${blocked ? "blocked" : "open"} ${isSelected ? "selected" : ""}`}
                                onClick={() =>
                                  !blocked && handleTimeSelect(slot)
                                }
                                disabled={blocked}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                        {selectedTime && (
                          <p className="reservation-notice">
                            ⏱ Your slot is reserved for 15 minutes. Please
                            complete your order before it expires.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* Payment */}
              <section className="checkout-section">
                <h2 className="checkout-section-title">Payment</h2>
                <p className="checkout-section-note">
                  We accept PayPal, Venmo, or payment on delivery. If paying
                  digitally, please send payment before your delivery date.
                </p>

                <div className="payment-options">
                  <button
                    className={`payment-option ${paymentMethod === "paypal" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("paypal")}
                  >
                    <span className="payment-option-icon">💳</span>
                    <span>PayPal</span>
                    {paymentMethod === "paypal" && (
                      <a
                        href="https://paypal.me/AfroditiSDeli"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="payment-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Pay Now →
                      </a>
                    )}
                  </button>

                  <button
                    className={`payment-option ${paymentMethod === "venmo" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("venmo")}
                  >
                    <span className="payment-option-icon">💜</span>
                    <span>Venmo</span>
                    {paymentMethod === "venmo" && (
                      <a
                        href="https://venmo.com/Afroditi-Kritikou"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="payment-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Pay Now →
                      </a>
                    )}
                  </button>

                  <button
                    className={`payment-option ${paymentMethod === "pay_on_delivery" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("pay_on_delivery")}
                  >
                    <span className="payment-option-icon">🤝</span>
                    <span>Cash or Check on Delivery</span>
                  </button>
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN — Order Summary ── */}
            <div className="checkout-right">
              <div className="order-summary">
                <h2 className="order-summary-title">Order Summary</h2>

                <div className="order-summary-items">
                  {cartItems.map((item) => (
                    <div key={item.id} className="summary-item">
                      <div className="summary-item-details">
                        <p className="summary-item-name">{item.dishName}</p>
                        {item.quantities.map((q) => (
                          <p key={q.size} className="summary-item-qty">
                            {q.size.charAt(0).toUpperCase() + q.size.slice(1)} ×
                            {q.quantity} — ${(q.price * q.quantity).toFixed(2)}
                          </p>
                        ))}
                        {item.specialInstructions && (
                          <p className="summary-item-note">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-summary-total">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                {submitError && (
                  <div className="checkout-error">{submitError}</div>
                )}

                <button
                  className="place-order-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Placing Order…" : "Place Order"}
                </button>

                <p className="checkout-disclaimer">
                  By placing your order you agree to our delivery terms. Your
                  order is pending until approved by Afroditi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
