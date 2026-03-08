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

    // Immediately block the selected time slot and its ±30-min buffer
    // so concurrent customers cannot book the same window.
    await saveBookedSlots(payload.deliveryDate, payload.deliveryTime);

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
 * Returns booked — the exact delivery times on the given date (pending + active),
 * expanded to include their ±30-min buffer slots.
 */
export async function getBookedTimesForDate(
  date: Date,
): Promise<{ booked: string[] }> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query by date range only (no composite index required), then filter
    // by status in application code to avoid missing Firestore indexes.
    const dateSnap = await getDocs(
      query(
        collection(db, "orders"),
        where("deliveryDate", ">=", Timestamp.fromDate(startOfDay)),
        where("deliveryDate", "<=", Timestamp.fromDate(endOfDay)),
      ),
    );
    const rawBooked: string[] = dateSnap.docs
      .filter((d) => {
        const status = d.data().status;
        return status === "active" || status === "pending";
      })
      .map((d) => d.data().deliveryTime as string)
      .filter(Boolean);

    // Expand each booked time to include its ±30-min buffer slots.
    // Expand each booked time to include its ±30-min buffer slots.
    const bookedWithBuffer = new Set<string>();
    for (const t of rawBooked) {
      for (const slot of getBufferSlots(t, ALL_TIME_SLOTS)) {
        bookedWithBuffer.add(slot);
      }
    }

    return { booked: Array.from(bookedWithBuffer) };
  } catch (error) {
    console.error("Error fetching booked times:", error);
    return { booked: [] };
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

// ─── Admin: Blocked Time Slots (per-day) ─────
// ────────────────────────────────
// Stored in Firestore as adminSettings/bookedSlots → { [dateKey]: string[] }
// Each entry is the set of slots blocked due to approved orders (incl. buffers).

const BOOKED_SLOTS_DOC = doc(db, "adminSettings", "bookedSlots");

async function getBookedSlotsMap(): Promise<Record<string, string[]>> {
  const snap = await getDoc(BOOKED_SLOTS_DOC);
  if (!snap.exists()) return {};
  return (snap.data() as Record<string, string[]>) ?? {};
}

/**
 * Persist the buffer slots for a placed order so that the time slot
 * and its ±30-min buffer are immediately blocked for other customers.
 */
async function saveBookedSlots(
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

    const deliveryDate: Date =
      data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate);
    const deliveryTime: string = data.deliveryTime;

    await updateDoc(doc(db, "orders", orderId), {
      status: "declined",
      isNewForAdmin: false,
      adminNotes: adminNotes || "",
      updatedAt: Timestamp.now(),
    });

    // Free up the slots — blocked at placement time, so always unblock on decline.
    await removeBookedSlotsForDecline(deliveryDate, deliveryTime);
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
