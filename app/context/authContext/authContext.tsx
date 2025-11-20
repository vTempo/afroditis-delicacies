import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import {
  registerUser,
  loginUser,
  signInWithGoogle,
  logoutUser,
  resetPassword,
  resendVerificationEmail,
  getUserProfile,
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  getUserOrders
} from "../../services/authService";
import type { UserProfile, OrderHistory, AuthFormData } from "../../types/types";

interface AuthContextType {
  // Auth state
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;

  // Auth functions
  register: (formData: AuthFormData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;

  // Profile functions
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;

  // Order functions
  getOrders: () => Promise<OrderHistory[]>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Failed to load user profile:', error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register new user
  async function register(formData: AuthFormData): Promise<void> {
    try {
      const newUser = await registerUser(formData);
      // Profile will be loaded by onAuthStateChanged
    } catch (error) {
      throw error;
    }
  }

  // Login existing user
  async function login(email: string, password: string): Promise<void> {
    try {
      await loginUser(email, password);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      throw error;
    }
  }

  // Login with Google
  async function loginWithGoogle(): Promise<void> {
    try {
      await signInWithGoogle();
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      throw error;
    }
  }

  // Logout current user
  async function logout(): Promise<void> {
    try {
      await logoutUser();
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  }

  // Send password reset email
  async function sendPasswordReset(email: string): Promise<void> {
    try {
      await resetPassword(email);
    } catch (error) {
      throw error;
    }
  }

  // Resend email verification
  async function resendVerification(): Promise<void> {
    if (!user) {
      throw new Error('No user signed in');
    }
    try {
      await resendVerificationEmail(user);
    } catch (error) {
      throw error;
    }
  }

  // Refresh user profile from Firestore
  async function refreshProfile(): Promise<void> {
    if (!user) return;

    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      await updateUserProfile(user.uid, updates);
      await refreshProfile();
    } catch (error) {
      throw error;
    }
  }

  // Change user email
  async function changeEmail(newEmail: string): Promise<void> {
    try {
      await updateUserEmail(newEmail);
      await user?.reload();
      await refreshProfile();
    } catch (error) {
      throw error;
    }
  }

  // Change user password
  async function changePassword(newPassword: string): Promise<void> {
    try {
      await updateUserPassword(newPassword);
    } catch (error) {
      throw error;
    }
  }

  // Get user orders
  async function getOrders(): Promise<OrderHistory[]> {
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      return await getUserOrders(user.uid);
    } catch (error) {
      throw error;
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
    sendPasswordReset,
    resendVerification,
    refreshProfile,
    updateProfile,
    changeEmail,
    changePassword,
    getOrders
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}