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
