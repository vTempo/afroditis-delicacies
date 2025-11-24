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
    accountStatus: 'active' | 'suspended' | 'pending_verification';

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
    status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
    orderDate: Date;
    deliveryDate: Date;
    deliveryAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
    };
    paymentMethod: 'cash' | 'check' | 'venmo' | 'paypal';
    specialInstructions?: string;
}

export interface AuthFormData {
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    phoneNumber?: string;
}