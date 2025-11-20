import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    type User,
    type AuthError
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import type { UserProfile, OrderHistory, AuthFormData } from '../types/types';

/**
 * Register a new user with email and password
 * Creates user profile in Firestore and sends verification email
 */
export async function registerUser(formData: AuthFormData): Promise<User> {
    try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
        );

        const user = userCredential.user;

        // Update display name in Firebase Auth
        if (formData.firstName && formData.lastName) {
            await updateProfile(user, {
                displayName: `${formData.firstName} ${formData.lastName}`
            });
        }

        // Create user profile document in Firestore
        const userProfile: UserProfile = {
            uid: user.uid,
            email: formData.email,
            firstName: formData.firstName || '',
            lastName: formData.lastName || '',
            displayName: `${formData.firstName} ${formData.lastName}`,
            phoneNumber: formData.phoneNumber,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            accountStatus: 'pending_verification',
            preferences: {
                emailNotifications: true,
                orderUpdates: true,
                marketingEmails: false
            }
        };

        await setDoc(doc(db, 'users', user.uid), {
            ...userProfile,
            createdAt: Timestamp.fromDate(userProfile.createdAt),
            updatedAt: Timestamp.fromDate(userProfile.updatedAt)
        });

        // Send email verification
        await sendEmailVerification(user);

        return user;
    } catch (error) {
        const authError = error as AuthError;
        console.error('Registration error:', authError);
        throw new Error(getAuthErrorMessage(authError));
    }
}

/**
 * Sign in existing user
 */
export async function loginUser(email: string, password: string): Promise<User> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Update last login timestamp
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
            lastLogin: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return userCredential.user;
    } catch (error) {
        const authError = error as AuthError;
        console.error('Login error:', authError);
        throw new Error(getAuthErrorMessage(authError));
    }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        throw new Error('Failed to sign out. Please try again.');
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        const authError = error as AuthError;
        console.error('Password reset error:', authError);
        throw new Error(getAuthErrorMessage(authError));
    }
}

/**
 * Resend email verification
 */
export async function resendVerificationEmail(user: User): Promise<void> {
    try {
        await sendEmailVerification(user);
    } catch (error) {
        console.error('Resend verification error:', error);
        throw new Error('Failed to send verification email. Please try again.');
    }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();
        return {
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
        } as UserProfile;
    } catch (error) {
        console.error('Get user profile error:', error);
        throw new Error('Failed to fetch user profile.');
    }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
): Promise<void> {
    try {
        const updateData = {
            ...updates,
            updatedAt: Timestamp.now()
        };

        await updateDoc(doc(db, 'users', uid), updateData);

        // If display name changed, update Firebase Auth profile
        if (updates.firstName || updates.lastName) {
            const user = auth.currentUser;
            if (user) {
                await updateProfile(user, {
                    displayName: `${updates.firstName || ''} ${updates.lastName || ''}`.trim()
                });
            }
        }
    } catch (error) {
        console.error('Update profile error:', error);
        throw new Error('Failed to update profile. Please try again.');
    }
}

/**
 * Update user email
 */
export async function updateUserEmail(newEmail: string): Promise<void> {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in');

        await updateEmail(user, newEmail);
        await sendEmailVerification(user);

        // Update Firestore
        await updateDoc(doc(db, 'users', user.uid), {
            email: newEmail,
            emailVerified: false,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        const authError = error as AuthError;
        console.error('Update email error:', authError);
        throw new Error(getAuthErrorMessage(authError));
    }
}

/**
 * Update user password
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in');

        await updatePassword(user, newPassword);
    } catch (error) {
        const authError = error as AuthError;
        console.error('Update password error:', authError);
        throw new Error(getAuthErrorMessage(authError));
    }
}

/**
 * Get user's order history
 */
export async function getUserOrders(uid: string): Promise<OrderHistory[]> {
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('userId', '==', uid),
            orderBy('orderDate', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const orders: OrderHistory[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            orders.push({
                orderId: doc.id,
                ...data,
                orderDate: data.orderDate.toDate(),
                deliveryDate: data.deliveryDate.toDate()
            } as OrderHistory);
        });

        return orders;
    } catch (error) {
        console.error('Get orders error:', error);
        throw new Error('Failed to fetch order history.');
    }
}

/**
 * Check if email is already registered
 */
export async function checkEmailExists(email: string): Promise<boolean> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        return !querySnapshot.empty;
    } catch (error) {
        console.error('Check email error:', error);
        return false;
    }
}

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
function getAuthErrorMessage(error: AuthError): string {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in or use a different email.';
        case 'auth/invalid-email':
            return 'Invalid email address. Please check and try again.';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled. Please contact support.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please check or sign up.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.';
        case 'auth/requires-recent-login':
            return 'This operation requires recent authentication. Please sign in again.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}

export { getAuthErrorMessage };