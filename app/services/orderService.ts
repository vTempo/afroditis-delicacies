import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from "../types/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOrderCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}

function docToOrder(id: string, data: any): Order {
  return {
    id,
    orderCode: data.orderCode,
    userId: data.userId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    items: data.items || [],
    subtotal: data.subtotal,
    status: data.status,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    deliveryAddress: data.deliveryAddress,
    deliveryDate: data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate),
    deliveryTime: data.deliveryTime,
    orderDate: data.orderDate?.toDate?.() ?? new Date(data.orderDate),
    adminNotes: data.adminNotes || "",
    isNewForAdmin: data.isNewForAdmin ?? true,
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
  };
}

/** Format a Date as "YYYY-MM-DD" key using local time */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Convert a time string like "2:30 PM" → minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [timePart, ampm] = time.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hours = h;
  if (ampm === "PM" && h !== 12) hours += 12;
  if (ampm === "AM" && h === 12) hours = 0;
  return hours * 60 + m;
}

/**
 * Given a booked delivery time, return the set of all time slots that must be
 * blocked: the booked slot itself + the slot immediately before and after it
 * (±30 min), to provide a traffic buffer.
 */
function getBufferSlots(bookedTime: string, allSlots: string[]): string[] {
  const bookedMins = timeToMinutes(bookedTime);
  return allSlots.filter(
    (slot) => Math.abs(timeToMinutes(slot) - bookedMins) <= 30,
  );
}

// All possible time slots (10 AM – 10 PM in 30-min increments).
// Keeping this in the service so buffer logic and checkout share the same list.
export const ALL_TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 10; h < 22; h++) {
    const ampm = h < 12 ? "AM" : "PM";
    const hour = h <= 12 ? h : h - 12;
    slots.push(`${hour}:00 ${ampm}`);
    slots.push(`${hour}:30 ${ampm}`);
  }
  slots.push("10:00 PM");
  return slots;
})();

// Maximum deliveries allowed per calendar week (Sun–Sat).
const MAX_DELIVERIES_PER_WEEK = 3;

/**
 * Return the ISO "YYYY-WW" week identifier for a given date,
 * using Sun–Sat weeks keyed by the Sunday of that week.
 */
function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day); // rewind to Sunday
  return dateKey(d); // "YYYY-MM-DD" of that Sunday
}

/**
 * Count how many *active* (approved) orders fall in the same Sun–Sat week
 * as the given date. Returns the count.
 */
async function getWeeklyApprovedDeliveryCount(date: Date): Promise<number> {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();

  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, "orders"),
    where("status", "==", "active"),
    where("deliveryDate", ">=", Timestamp.fromDate(sunday)),
    where("deliveryDate", "<=", Timestamp.fromDate(saturday)),
  );

  const snap = await getDocs(q);
  return snap.size;
}

/**
 * If the week containing `date` now has MAX_DELIVERIES_PER_WEEK active orders,
 * block every day in that week that isn't already blocked.
 */
async function autoBlockWeekIfFull(date: Date): Promise<void> {
  const count = await getWeeklyApprovedDeliveryCount(date);
  if (count < MAX_DELIVERIES_PER_WEEK) return;

  // Block every remaining day in this Sun–Sat week.
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());

  const snap = await getDoc(BLOCKED_DAYS_DOC);
  const existing: string[] = snap.exists() ? (snap.data().days ?? []) : [];
  const toAdd: string[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const key = dateKey(day);
    if (!existing.includes(key)) toAdd.push(key);
  }

  if (toAdd.length > 0) {
    await setDoc(BLOCKED_DAYS_DOC, { days: [...existing, ...toAdd] });
  }
}

/**
 * Remove the blocked days that were auto-added for a week when an order in
 * that week is declined — but only if the week drops below the cap again.
 * We must NOT unblock days that the admin manually blocked.
 *
 * Strategy: after removing the approved order, recount. If count < cap,
 * remove the week's days from the blocked list (trusting that the admin
 * manages their own manual blocks separately — if they want a day blocked
 * they can re-block it).
 */
async function autoUnblockWeekIfBelowCap(date: Date): Promise<void> {
  // Count *after* the decline has already been written, so this is the new count.
  const count = await getWeeklyApprovedDeliveryCount(date);
  if (count >= MAX_DELIVERIES_PER_WEEK) return;

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());

  const weekDayKeys = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      return dateKey(day);
    }),
  );

  const snap = await getDoc(BLOCKED_DAYS_DOC);
  if (!snap.exists()) return;
  const existing: string[] = snap.data().days ?? [];
  const filtered = existing.filter((k) => !weekDayKeys.has(k));
  await setDoc(BLOCKED_DAYS_DOC, { days: filtered });
}

// ─── Place Order ─────────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  paymentMethod: PaymentMethod;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    fullAddress: string;
  };
  deliveryDate: Date;
  deliveryTime: string;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<string> {
  try {
    const orderCode = generateOrderCode();
    const now = Timestamp.now();

    const orderData = {
      orderCode,
      userId: payload.userId,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      items: payload.items,
      subtotal: payload.subtotal,
      status: "pending" as OrderStatus,
      paymentMethod: payload.paymentMethod,
      paymentStatus:
        payload.paymentMethod === "pay_on_delivery"
          ? "pending_payment"
          : "paid",
      deliveryAddress: payload.deliveryAddress,
      deliveryDate: Timestamp.fromDate(payload.deliveryDate),
      deliveryTime: payload.deliveryTime,
      orderDate: now,
      adminNotes: "",
      isNewForAdmin: true,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, "orders"), orderData);
    return docRef.id;
  } catch (error) {
    console.error("Error placing order:", error);
    throw new Error("Failed to place order. Please try again.");
  }
}

// ─── Get Order By ID ──────────────────────────────────────────────────────────

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) return null;
    return docToOrder(snap.id, snap.data());
  } catch (error) {
    console.error("Error getting order:", error);
    return null;
  }
}

// ─── Subscribe to All Orders ──────────────────────────────────────────────────

export function subscribeToAllOrders(
  callback: (orders: Order[]) => void,
): () => void {
  const q = collection(db, "orders");
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
    orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    callback(orders);
  });
}

export function getNewOrderCount(
  callback: (count: number) => void,
): () => void {
  const q = query(collection(db, "orders"), where("isNewForAdmin", "==", true));
  return onSnapshot(q, (snap) => {
    callback(snap.size);
  });
}

// ─── Check Booked / Reserved Times ───────────────────────────────────────────

/**
 * Returns:
 *   booked   — the exact approved delivery times on the given date
 *              (the caller should expand these into buffer slots for display)
 *   reserved — time slots currently held by other users' 10-minute reservations
 */
export async function getBookedTimesForDate(
  date: Date,
  currentUserId?: string,
): Promise<{ booked: string[]; reserved: string[] }> {
  const key = dateKey(date);
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch both active (approved) and pending orders on this day.
    // Pending orders must also block slots to prevent double-booking
    // while awaiting admin review.
    const [activeSnap, pendingSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "orders"),
          where("status", "==", "active"),
          where("deliveryDate", ">=", Timestamp.fromDate(startOfDay)),
          where("deliveryDate", "<=", Timestamp.fromDate(endOfDay)),
        ),
      ),
      getDocs(
        query(
          collection(db, "orders"),
          where("status", "==", "pending"),
          where("deliveryDate", ">=", Timestamp.fromDate(startOfDay)),
          where("deliveryDate", "<=", Timestamp.fromDate(endOfDay)),
        ),
      ),
    ]);
    const rawBooked: string[] = [...activeSnap.docs, ...pendingSnap.docs]
      .map((d) => d.data().deliveryTime as string)
      .filter(Boolean);

    // Expand each booked time to include its ±30-min buffer slots.
    const bookedWithBuffer = new Set<string>();
    for (const t of rawBooked) {
      for (const slot of getBufferSlots(t, ALL_TIME_SLOTS)) {
        bookedWithBuffer.add(slot);
      }
    }

    // Fetch active reservations from other users (not expired).
    const resQ = query(
      collection(db, "timeReservations"),
      where("dateKey", "==", key),
    );
    const resSnap = await getDocs(resQ);
    const reserved: string[] = [];
    resSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.userId === currentUserId) return; // ignore own reservation
      const expiresAt: Date = data.expiresAt?.toDate?.() ?? new Date(0);
      if (expiresAt > new Date()) reserved.push(data.time as string);
    });

    return { booked: Array.from(bookedWithBuffer), reserved };
  } catch (error) {
    console.error("Error fetching booked times:", error);
    return { booked: [], reserved: [] };
  }
}

// ─── Time Slot Reservations ───────────────────────────────────────────────────

/**
 * Reserve a time slot for 10 minutes while the customer completes checkout.
 */
export async function reserveTimeSlot(
  date: Date,
  time: string,
  userId: string,
): Promise<string> {
  // 10-minute reservation window (was 15 — corrected per spec).
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const docRef = await addDoc(collection(db, "timeReservations"), {
    dateKey: dateKey(date),
    time,
    userId,
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  return docRef.id;
}

export async function releaseReservation(reservationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "timeReservations", reservationId));
  } catch {
    // silent — may already be gone
  }
}

// ─── Admin: Blocked Days ──────────────────────────────────────────────────────

const BLOCKED_DAYS_DOC = doc(db, "adminSettings", "blockedDays");

export async function getBlockedDays(): Promise<string[]> {
  try {
    const snap = await getDoc(BLOCKED_DAYS_DOC);
    if (!snap.exists()) return [];
    return (snap.data().days as string[]) ?? [];
  } catch {
    return [];
  }
}

export function subscribeToBlockedDays(
  callback: (days: string[]) => void,
): () => void {
  return onSnapshot(BLOCKED_DAYS_DOC, (snap) => {
    callback(snap.exists() ? ((snap.data().days as string[]) ?? []) : []);
  });
}

export async function blockDay(date: Date): Promise<void> {
  const key = dateKey(date);
  const snap = await getDoc(BLOCKED_DAYS_DOC);
  const existing: string[] = snap.exists() ? (snap.data().days ?? []) : [];
  if (!existing.includes(key)) {
    await setDoc(BLOCKED_DAYS_DOC, { days: [...existing, key] });
  }
}

export async function unblockDay(date: Date): Promise<void> {
  const key = dateKey(date);
  const snap = await getDoc(BLOCKED_DAYS_DOC);
  const existing: string[] = snap.exists() ? (snap.data().days ?? []) : [];
  await setDoc(BLOCKED_DAYS_DOC, { days: existing.filter((d) => d !== key) });
}

// ─── Admin: Blocked Time Slots (per-day) ─────────────────────────────────────
// Stored in Firestore as adminSettings/bookedSlots → { [dateKey]: string[] }
// Each entry is the set of slots blocked due to approved orders (incl. buffers).

const BOOKED_SLOTS_DOC = doc(db, "adminSettings", "bookedSlots");

async function getBookedSlotsMap(): Promise<Record<string, string[]>> {
  const snap = await getDoc(BOOKED_SLOTS_DOC);
  if (!snap.exists()) return {};
  return (snap.data() as Record<string, string[]>) ?? {};
}

/**
 * Persist the buffer slots for an approved order so that customers
 * immediately see them as blocked when they load the checkout calendar.
 */
async function saveBookedSlotsForApproval(
  deliveryDate: Date,
  deliveryTime: string,
): Promise<void> {
  const key = dateKey(deliveryDate);
  const slotsMap = await getBookedSlotsMap();
  const existing: string[] = slotsMap[key] ?? [];
  const newSlots = getBufferSlots(deliveryTime, ALL_TIME_SLOTS);
  const merged = Array.from(new Set([...existing, ...newSlots]));
  await setDoc(BOOKED_SLOTS_DOC, { ...slotsMap, [key]: merged });
}

/**
 * Remove the buffer slots that were added when the order was approved,
 * restoring those slots to available when an order is declined.
 */
async function removeBookedSlotsForDecline(
  deliveryDate: Date,
  deliveryTime: string,
): Promise<void> {
  const key = dateKey(deliveryDate);
  const slotsMap = await getBookedSlotsMap();
  const existing: string[] = slotsMap[key] ?? [];
  const slotsToRemove = new Set(getBufferSlots(deliveryTime, ALL_TIME_SLOTS));
  const remaining = existing.filter((s) => !slotsToRemove.has(s));
  if (remaining.length === 0) {
    const { [key]: _removed, ...rest } = slotsMap;
    await setDoc(BOOKED_SLOTS_DOC, rest);
  } else {
    await setDoc(BOOKED_SLOTS_DOC, { ...slotsMap, [key]: remaining });
  }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

/**
 * Approve an order:
 *  1. Set status → "active"
 *  2. Persist the delivery slot + its ±30-min buffer as blocked
 *  3. Auto-block the whole week if this fills the weekly cap
 */
export async function approveOrder(orderId: string): Promise<void> {
  try {
    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (!orderSnap.exists()) throw new Error("Order not found.");
    const data = orderSnap.data();
    const deliveryDate: Date =
      data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate);
    const deliveryTime: string = data.deliveryTime;

    await updateDoc(doc(db, "orders", orderId), {
      status: "active",
      isNewForAdmin: false,
      updatedAt: Timestamp.now(),
    });

    // Block the delivery slot and its ±30-min buffer.
    await saveBookedSlotsForApproval(deliveryDate, deliveryTime);

    // Auto-block the week if the cap is now reached.
    await autoBlockWeekIfFull(deliveryDate);
  } catch (error) {
    console.error("Error approving order:", error);
    throw new Error("Failed to approve order.");
  }
}

/**
 * Decline an order:
 *  1. Set status → "declined"
 *  2. Remove the blocked delivery slots so they're available again
 *  3. Unblock the week if it drops below the cap
 */
export async function declineOrder(
  orderId: string,
  adminNotes?: string,
): Promise<void> {
  try {
    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (!orderSnap.exists()) throw new Error("Order not found.");
    const data = orderSnap.data();

    // Only undo slot-blocking if the order was previously active (approved).
    const wasActive = data.status === "active";
    const deliveryDate: Date =
      data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate);
    const deliveryTime: string = data.deliveryTime;

    await updateDoc(doc(db, "orders", orderId), {
      status: "declined",
      isNewForAdmin: false,
      adminNotes: adminNotes || "",
      updatedAt: Timestamp.now(),
    });

    if (wasActive) {
      // Free up the slots.
      await removeBookedSlotsForDecline(deliveryDate, deliveryTime);
      // Unblock the week if it's now below the cap.
      await autoUnblockWeekIfBelowCap(deliveryDate);
    }
  } catch (error) {
    console.error("Error declining order:", error);
    throw new Error("Failed to decline order.");
  }
}

/** Mark an order as delivered (status → "delivered") */
export async function markOrderDelivered(orderId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: "delivered",
      isNewForAdmin: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error marking order delivered:", error);
    throw new Error("Failed to mark order as delivered.");
  }
}

/** Mark order as viewed by admin (clears the notification badge count) */
export async function markOrderViewedByAdmin(orderId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      isNewForAdmin: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error marking order as viewed:", error);
  }
}

// ─── Customer: Get Orders By User ─────────────────────────────────────────────

/**
 * Fetch all orders placed by a specific user, sorted newest first.
 */
export async function getOrdersByUser(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
    orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    return orders;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
}
