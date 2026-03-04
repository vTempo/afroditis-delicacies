// TypeScript types for user data
export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  role: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;

  // Address information
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Account status
  accountStatus: "active" | "suspended" | "pending_verification";

  // Preferences
  preferences?: {
    emailNotifications: boolean;
    orderUpdates: boolean;
    marketingEmails: boolean;
  };
}

// ─── ORDER TYPES ─────────────────────────────────────────────────────────────
export interface OrderItem {
  menuItemId: string;
  dishName: string;
  category: string;
  imageUrl?: string;
  quantities: Array<{
    size: string;
    price: number;
    quantity: number;
  }>;
  specialInstructions?: string;
  itemSubtotal: number;
}

export type OrderStatus =
  | "pending" // Customer placed order, awaiting admin review
  | "active" // Admin approved, order is being prepared / en route
  | "declined" // Admin declined the order
  | "delivered"; // Admin marked as delivered

export type PaymentMethod = "paypal" | "venmo" | "pay_on_delivery";

export interface Order {
  id: string; // Firestore document ID
  orderCode: string; // Human-readable order code e.g. "ORD-20240301-4F2A"
  userId: string;
  customerName: string; // Full name at time of order
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "paid" | "pending_payment"; // Venmo/PayPal = paid, pay_on_delivery = pending
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    fullAddress: string; // Full formatted string for display
  };
  deliveryDate: Date; // Selected delivery date
  deliveryTime: string; // e.g. "2:00 PM"
  orderDate: Date; // When the order was placed
  adminNotes?: string; // Optional notes from admin (e.g. reason for decline)
  isNewForAdmin: boolean; // True until admin first views / acts on the order
  updatedAt: Date;
}

// Kept for backwards compatibility with authService.getUserOrders
// New code should use Order instead
export interface OrderHistory {
  orderId: string;
  userId: string;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    size?: string;
    price: number;
  }>;
  totalAmount: number;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  orderDate: Date;
  deliveryDate: Date;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: "cash" | "check" | "venmo" | "paypal";
  specialInstructions?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AuthFormData {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

// Types for menu items and categories
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  secondPrice?: number; // For items with two sizes (Large/Small)
  description?: string;
  imgPath?: string;
  available: boolean;
  order: number; // For sorting items within a category
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number; // For sorting categories
  hasTwoSizes: boolean; // True for categories like "Traditional Greek Pies" and "Beef Dishes"
}

export interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
  menuNote: string;
}

// Types for shopping cart
export interface CartItemQuantity {
  size: string; // "single", "large", "small", etc.
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string; // Firestore document ID
  userId: string;
  menuItemId: string; // Reference to the menu item
  dishName: string;
  category: string;
  imageUrl?: string;
  quantities: CartItemQuantity[]; // Array to support multiple sizes
  specialInstructions?: string;
  addedAt: Date;
}
