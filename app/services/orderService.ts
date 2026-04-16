import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from "../types/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}

function docToOrder(id: string, data: Record<string, any>): Order {
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
    discountPercent: data.discountPercent ?? undefined,
    discountedSubtotal: data.discountedSubtotal ?? undefined,
    isNewForAdmin: data.isNewForAdmin ?? true,
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
  };
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [timePart, ampm] = time.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hours = h;
  if (ampm === "PM" && h !== 12) hours += 12;
  if (ampm === "AM" && h === 12) hours = 0;
  return hours * 60 + m;
}

function getBufferSlots(bookedTime: string, allSlots: string[]): string[] {
  const bookedMins = timeToMinutes(bookedTime);
  return allSlots.filter(
    (slot) => Math.abs(timeToMinutes(slot) - bookedMins) <= 30,
  );
}

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

// ─── Place Order ──────────────────────────────────────────────────────────────

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
  initialStatus?: OrderStatus;
  discountPercent?: number;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, "orders"), {
      orderCode: generateOrderCode(),
      userId: payload.userId,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      items: payload.items,
      subtotal: payload.subtotal,
      status: (payload.initialStatus ?? "pending") as OrderStatus,
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
      ...(payload.discountPercent !== undefined && {
        discountPercent: payload.discountPercent,
      }),
    });
    await saveBookedSlots(payload.deliveryDate, payload.deliveryTime);
    return docRef.id;
  } catch (error) {
    console.error("Error placing order:", error);
    throw new Error("Failed to place order. Please try again.");
  }
}

// ─── Order Queries ────────────────────────────────────────────────────────────

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

export function subscribeToAllOrders(
  callback: (orders: Order[]) => void,
): () => void {
  return onSnapshot(collection(db, "orders"), (snap) => {
    const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
    orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    callback(orders);
  });
}

export function getNewOrderCount(
  callback: (count: number) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "orders"), where("isNewForAdmin", "==", true)),
    (snap) => callback(snap.size),
  );
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "orders"), where("userId", "==", userId)),
    );
    const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
    orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    return orders;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
}

// ─── Booked Times ─────────────────────────────────────────────────────────────

export async function getBookedTimesForDate(
  date: Date,
): Promise<{ booked: string[] }> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateSnap = await getDocs(
      query(
        collection(db, "orders"),
        where("deliveryDate", ">=", Timestamp.fromDate(startOfDay)),
        where("deliveryDate", "<=", Timestamp.fromDate(endOfDay)),
      ),
    );

    const rawBooked: string[] = dateSnap.docs
      .filter((d) => ["active", "pending"].includes(d.data().status))
      .map((d) => d.data().deliveryTime as string)
      .filter(Boolean);

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

// ─── Blocked Days ─────────────────────────────────────────────────────────────

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
  purgePastCalendarData();
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

export async function purgePastCalendarData(): Promise<void> {
  const todayKey = dateKey(new Date());

  try {
    const blockedSnap = await getDoc(BLOCKED_DAYS_DOC);
    if (blockedSnap.exists()) {
      const current: string[] = blockedSnap.data().days ?? [];
      const filtered = current.filter((d) => d >= todayKey);
      if (filtered.length !== current.length) {
        await setDoc(BLOCKED_DAYS_DOC, { days: filtered });
      }
    }
  } catch (error) {
    console.error("Error purging past blocked days:", error);
  }

  try {
    const slotsSnap = await getDoc(BOOKED_SLOTS_DOC);
    if (slotsSnap.exists()) {
      const slotsMap = slotsSnap.data() as Record<string, string[]>;
      const filtered = Object.fromEntries(
        Object.entries(slotsMap).filter(([key]) => key >= todayKey),
      );
      if (Object.keys(filtered).length !== Object.keys(slotsMap).length) {
        await setDoc(BOOKED_SLOTS_DOC, filtered);
      }
    }
  } catch (error) {
    console.error("Error purging past booked slots:", error);
  }
}

// ─── Booked Slots ─────────────────────────────────────────────────────────────

const BOOKED_SLOTS_DOC = doc(db, "adminSettings", "bookedSlots");

async function getBookedSlotsMap(): Promise<Record<string, string[]>> {
  const snap = await getDoc(BOOKED_SLOTS_DOC);
  if (!snap.exists()) return {};
  return (snap.data() as Record<string, string[]>) ?? {};
}

async function saveBookedSlots(
  deliveryDate: Date,
  deliveryTime: string,
): Promise<void> {
  const key = dateKey(deliveryDate);
  const slotsMap = await getBookedSlotsMap();
  const merged = Array.from(
    new Set([
      ...(slotsMap[key] ?? []),
      ...getBufferSlots(deliveryTime, ALL_TIME_SLOTS),
    ]),
  );
  await setDoc(BOOKED_SLOTS_DOC, { ...slotsMap, [key]: merged });
}

async function removeBookedSlotsForDecline(
  deliveryDate: Date,
  deliveryTime: string,
): Promise<void> {
  const key = dateKey(deliveryDate);
  const slotsMap = await getBookedSlotsMap();
  const slotsToRemove = new Set(getBufferSlots(deliveryTime, ALL_TIME_SLOTS));
  const remaining = (slotsMap[key] ?? []).filter((s) => !slotsToRemove.has(s));
  if (remaining.length === 0) {
    const { [key]: _removed, ...rest } = slotsMap;
    await setDoc(BOOKED_SLOTS_DOC, rest);
  } else {
    await setDoc(BOOKED_SLOTS_DOC, { ...slotsMap, [key]: remaining });
  }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function approveOrder(
  orderId: string,
  discountPercent?: number,
): Promise<void> {
  try {
    const update: Record<string, any> = {
      status: "active",
      isNewForAdmin: false,
      updatedAt: Timestamp.now(),
    };

    if (discountPercent !== undefined && discountPercent > 0) {
      const orderSnap = await getDoc(doc(db, "orders", orderId));
      if (orderSnap.exists()) {
        const data = orderSnap.data();
        const originalSubtotal: number = data.subtotal ?? 0;
        const multiplier = 1 - discountPercent / 100;
        const discountedSubtotal = parseFloat(
          (originalSubtotal * multiplier).toFixed(2),
        );

        const updatedItems = (data.items ?? []).map((item: any) => ({
          ...item,
          itemSubtotal: parseFloat(
            ((item.itemSubtotal ?? 0) * multiplier).toFixed(2),
          ),
          quantities: (item.quantities ?? []).map((q: any) => ({
            ...q,
            price: parseFloat((q.price * multiplier).toFixed(2)),
          })),
        }));

        update.discountPercent = discountPercent;
        update.discountedSubtotal = discountedSubtotal;
        update.subtotal = discountedSubtotal;
        update.items = updatedItems;
      }
    }

    await updateDoc(doc(db, "orders", orderId), update);
  } catch (error) {
    console.error("Error approving order:", error);
    throw new Error("Failed to approve order.");
  }
}

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

    await updateDoc(doc(db, "orders", orderId), {
      status: "declined",
      isNewForAdmin: false,
      adminNotes: adminNotes || "",
      updatedAt: Timestamp.now(),
    });
    await removeBookedSlotsForDecline(deliveryDate, data.deliveryTime);
  } catch (error) {
    console.error("Error declining order:", error);
    throw new Error("Failed to decline order.");
  }
}

export async function scrapOrder(
  orderId: string,
  adminNotes?: string,
): Promise<void> {
  try {
    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (!orderSnap.exists()) throw new Error("Order not found.");
    const data = orderSnap.data();
    const deliveryDate: Date =
      data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate);

    await updateDoc(doc(db, "orders", orderId), {
      status: "scrapped",
      isNewForAdmin: false,
      adminNotes: adminNotes || "",
      updatedAt: Timestamp.now(),
    });
    await removeBookedSlotsForDecline(deliveryDate, data.deliveryTime);
  } catch (error) {
    console.error("Error scrapping order:", error);
    throw new Error("Failed to scrap order.");
  }
}

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

export async function updateOrderItems(
  orderId: string,
  items: OrderItem[],
  subtotal: number,
): Promise<void> {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      items,
      subtotal,
      discountedSubtotal: deleteField(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating order items:", error);
    throw new Error("Failed to update order items.");
  }
}

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

export async function deleteOrder(orderId: string): Promise<void> {
  try {
    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (!orderSnap.exists()) throw new Error("Order not found.");
    const data = orderSnap.data();

    const isDelivered = data.status === "delivered";
    if (isDelivered) {
      const deliveryDate: Date =
        data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate);
      const daysSinceDelivery =
        (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceDelivery > 7) {
        await setDoc(doc(db, "archivedOrders", orderId), {
          ...data,
          archivedAt: Timestamp.now(),
        });
      }
    }

    await deleteDoc(doc(db, "orders", orderId));
  } catch (error) {
    console.error("Error deleting order:", error);
    throw new Error("Failed to delete order.");
  }
}

// ─── Security ───────────────────────────────────────────────────────────────

export async function getRecentOrderCountForUser(
  userId: string,
): Promise<number> {
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("userId", "==", userId),
      where("orderDate", ">=", Timestamp.fromDate(since)),
    ),
  );
  return snap.size;
}
