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
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

// ─── Fetch Orders ─────────────────────────────────────────────────────────────

/** Get all orders for a specific customer (order history) */
export async function getOrdersByUser(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
    // Sort client-side: newest first
    return orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw new Error("Failed to fetch your orders.");
  }
}

/** Get all orders — admin only */
export async function getAllOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, "orders"));
    const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
    return orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
  } catch (error) {
    console.error("Error fetching all orders:", error);
    throw new Error("Failed to fetch orders.");
  }
}

/** Get a single order by Firestore doc ID */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) return null;
    return docToOrder(snap.id, snap.data());
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

// ─── Real-time Listener ───────────────────────────────────────────────────────

/**
 * Subscribe to all orders in real-time (admin use).
 * Returns an unsubscribe function.
 */
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

/**
 * Subscribe to the count of "new" (isNewForAdmin = true) orders.
 * Used by the header badge. Returns an unsubscribe function.
 */
export function getNewOrderCount(
  callback: (count: number) => void,
): () => void {
  const q = query(collection(db, "orders"), where("isNewForAdmin", "==", true));

  return onSnapshot(q, (snap) => {
    callback(snap.size);
  });
}

// ─── Check Booked Times ───────────────────────────────────────────────────────

/**
 * Returns all time slots already booked on a given date
 * (i.e. within ±1 hour of any approved order's deliveryTime).
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

    const ordersQ = query(
      collection(db, "orders"),
      where("status", "==", "active"),
      where("deliveryDate", ">=", Timestamp.fromDate(startOfDay)),
      where("deliveryDate", "<=", Timestamp.fromDate(endOfDay)),
    );
    const ordersSnap = await getDocs(ordersQ);
    const booked: string[] = ordersSnap.docs
      .map((d) => d.data().deliveryTime as string)
      .filter(Boolean);

    const resQ = query(
      collection(db, "timeReservations"),
      where("dateKey", "==", key),
    );
    const resSnap = await getDocs(resQ);
    const reserved: string[] = [];
    resSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.userId === currentUserId) return;
      const expiresAt: Date = data.expiresAt?.toDate?.() ?? new Date(0);
      if (expiresAt > new Date()) reserved.push(data.time as string);
    });

    return { booked, reserved };
  } catch (error) {
    console.error("Error fetching booked times:", error);
    return { booked: [], reserved: [] };
  }
}

// ─── Time Slot Reservations ───────────────────────────────────────────────────

export async function reserveTimeSlot(
  date: Date,
  time: string,
  userId: string,
): Promise<string> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
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

// ─── Admin Actions ────────────────────────────────────────────────────────────

/** Mark an order as approved (status → "active") */
export async function approveOrder(orderId: string): Promise<void> {
  try {
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

/** Mark an order as declined (status → "declined") */
export async function declineOrder(
  orderId: string,
  adminNotes?: string,
): Promise<void> {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: "declined",
      isNewForAdmin: false,
      adminNotes: adminNotes || "",
      updatedAt: Timestamp.now(),
    });
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
