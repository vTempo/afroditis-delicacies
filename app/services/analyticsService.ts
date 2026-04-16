// app/services/analyticsService.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Order, OrderStatus } from "../types/types";

export interface MonthlyAnalyticsData {
  revenueThisMonth: number;
  revenueLastMonth: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  averageOrderValue: number;
  statusBreakdown: Record<OrderStatus | "scrapped", number>;
  topDishes: Array<{ name: string; count: number }>;
  topCustomers: Array<{ name: string; orders: number; spent: number }>;
}

export interface AllTimeAnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueByMonth: Array<{ label: string; revenue: number }>;
  topDishes: Array<{ name: string; count: number }>;
  paymentBreakdown: Array<{ label: string; count: number }>;
}

function docToOrder(id: string, data: any): Order {
  return {
    id,
    orderCode: data.orderCode ?? "",
    userId: data.userId ?? "",
    customerName: data.customerName ?? "",
    customerEmail: data.customerEmail ?? "",
    customerPhone: data.customerPhone ?? "",
    items: data.items ?? [],
    subtotal: data.subtotal ?? 0,
    status: data.status ?? "pending",
    paymentMethod: data.paymentMethod ?? "pay_on_delivery",
    paymentStatus: data.paymentStatus ?? "pending_payment",
    deliveryAddress: data.deliveryAddress ?? {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      fullAddress: "",
    },
    deliveryDate: data.deliveryDate?.toDate?.() ?? new Date(data.deliveryDate),
    deliveryTime: data.deliveryTime ?? "",
    orderDate: data.orderDate?.toDate?.() ?? new Date(data.orderDate),
    adminNotes: data.adminNotes,
    isNewForAdmin: data.isNewForAdmin ?? false,
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
  };
}

function isCountable(order: Order): boolean {
  return order.status === "active" || order.status === "delivered";
}

async function fetchAllOrders(): Promise<Order[]> {
  const [ordersSnap, archivedSnap] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "archivedOrders")),
  ]);

  const orders = ordersSnap.docs.map((d) => docToOrder(d.id, d.data()));
  const archived = archivedSnap.docs.map((d) => docToOrder(d.id, d.data()));

  const seen = new Set<string>();
  return [...orders, ...archived].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

function computeTopDishes(
  orders: Order[],
): Array<{ name: string; count: number }> {
  const dishMap = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      const total = item.quantities.reduce((sum, q) => sum + q.quantity, 0);
      dishMap.set(item.dishName, (dishMap.get(item.dishName) ?? 0) + total);
    }
  }
  return Array.from(dishMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function computeTopCustomers(
  orders: Order[],
): Array<{ name: string; orders: number; spent: number }> {
  const customerMap = new Map<string, { orders: number; spent: number }>();
  for (const order of orders) {
    const name = order.customerName || "Unknown";
    const existing = customerMap.get(name) ?? { orders: 0, spent: 0 };
    customerMap.set(name, {
      orders: existing.orders + 1,
      spent: existing.spent + (order.subtotal ?? 0),
    });
  }
  return Array.from(customerMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
}

const PAYMENT_LABELS: Record<string, string> = {
  pay_on_delivery: "Cash / Check",
  venmo: "Venmo",
  paypal: "PayPal",
};

function computePaymentBreakdown(
  orders: Order[],
): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const order of orders) {
    const label = PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getMonthlyAnalytics(
  year: number,
  month: number,
): Promise<MonthlyAnalyticsData> {
  const allOrders = await fetchAllOrders();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(year, month - 1, 1);
  const lastMonthEnd = new Date(year, month, 0, 23, 59, 59);

  const inMonth = (order: Order) =>
    order.deliveryDate >= monthStart && order.deliveryDate <= monthEnd;
  const inLastMonth = (order: Order) =>
    order.deliveryDate >= lastMonthStart && order.deliveryDate <= lastMonthEnd;

  const thisMonthOrders = allOrders.filter(inMonth);
  const lastMonthOrders = allOrders.filter(inLastMonth);

  const countableThisMonth = thisMonthOrders.filter(isCountable);
  const countableLastMonth = lastMonthOrders.filter(isCountable);

  const revenueThisMonth = countableThisMonth.reduce(
    (sum, o) => sum + (o.subtotal ?? 0),
    0,
  );
  const revenueLastMonth = countableLastMonth.reduce(
    (sum, o) => sum + (o.subtotal ?? 0),
    0,
  );

  const averageOrderValue =
    countableThisMonth.length > 0
      ? countableThisMonth.reduce((sum, o) => sum + (o.subtotal ?? 0), 0) /
        countableThisMonth.length
      : 0;

  const statusBreakdown: Record<string, number> = {
    pending: 0,
    active: 0,
    delivered: 0,
    declined: 0,
    scrapped: 0,
  };
  for (const order of thisMonthOrders) {
    if (order.status in statusBreakdown) {
      statusBreakdown[order.status]++;
    }
  }

  return {
    revenueThisMonth,
    revenueLastMonth,
    ordersThisMonth: countableThisMonth.length,
    ordersLastMonth: countableLastMonth.length,
    averageOrderValue,
    statusBreakdown: statusBreakdown as Record<
      OrderStatus | "scrapped",
      number
    >,
    topDishes: computeTopDishes(countableThisMonth),
    topCustomers: computeTopCustomers(countableThisMonth),
  };
}

export async function getAllTimeAnalytics(): Promise<AllTimeAnalyticsData> {
  const allOrders = await fetchAllOrders();
  const countable = allOrders.filter(isCountable);

  const totalRevenue = countable.reduce((sum, o) => sum + (o.subtotal ?? 0), 0);
  const averageOrderValue =
    countable.length > 0 ? totalRevenue / countable.length : 0;

  const monthMap = new Map<string, number>();
  for (const order of countable) {
    const d = order.deliveryDate;
    const label = d.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthMap.set(label, (monthMap.get(label) ?? 0) + (order.subtotal ?? 0));
  }

  const revenueByMonth = Array.from(monthMap.entries())
    .map(([label, revenue]) => ({ label, revenue }))
    .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());

  return {
    totalRevenue,
    totalOrders: countable.length,
    averageOrderValue,
    revenueByMonth,
    topDishes: computeTopDishes(countable),
    paymentBreakdown: computePaymentBreakdown(countable),
  };
}
