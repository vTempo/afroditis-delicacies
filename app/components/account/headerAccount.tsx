// app/components/utils/headerAccount.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/authContext/authContext";
import { removeFavorite } from "../../services/favoritesService";
import { getUserFavorites } from "../../services/favoritesService";
import { getOrdersByUser } from "../../services/orderService";
import { getMenuData } from "../../services/menuService";
import type { Order, MenuItem } from "../../types/types";
import LoginForm from "../account/LoginForm";
import ForgotPasswordForm from "../account/ForgotPasswordForm";
import FavoritesView from "../account/FavoritesView";
import OrderHistoryView from "../account/OrderHistoryView";
import AccountSettingsView from "../account/AccountSettingsView";
import ManageCalendarView from "../account/ManageCalendarView";
import "../../styles/headerAccount.css";

interface HeaderAccountProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileView =
  | "main"
  | "favorites"
  | "orderHistory"
  | "accountSettings"
  | "manageCalendar"
  | "forgotPassword";

const VIEW_TITLES: Record<ProfileView, string> = {
  main: "My Account",
  manageCalendar: "Manage Calendar",
  favorites: "My Favorites",
  orderHistory: "Order History",
  accountSettings: "Account Settings",
  forgotPassword: "Reset Password",
};

function ChevronRight() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="currentColor"
        d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
      />
    </svg>
  );
}

const HeaderAccount: React.FC<HeaderAccountProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, logout, sendVerificationEmail, reloadUser } =
    useAuth();
  const navigate = useNavigate();
  const isAdmin = user && userProfile?.role === "admin";

  const isGoogleUser = user?.providerData.some(
    (p) => p.providerId === "google.com",
  );
  const isUnverified = !!user && !isGoogleUser && !user.emailVerified;

  const [currentView, setCurrentView] = useState<ProfileView>("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Verification banner state ──
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // ── Favorites state ──
  const [favoriteItems, setFavoriteItems] = useState<MenuItem[]>([]);
  const [hasTwoSizesMap, setHasTwoSizesMap] = useState<Record<string, boolean>>(
    {},
  );
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Order history state ──
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (currentView !== "orderHistory" || !user) return;
    setOrdersLoading(true);
    getOrdersByUser(user.uid)
      .then(setOrderHistory)
      .catch(console.error)
      .finally(() => setOrdersLoading(false));
  }, [currentView, user]);

  useEffect(() => {
    if (currentView !== "favorites" || !user) return;
    setFavoritesLoading(true);
    Promise.all([getUserFavorites(user.uid), getMenuData()])
      .then(([favIds, menuData]) => {
        const favItems = menuData.items.filter(
          (item) => favIds.includes(item.id) && item.available,
        );
        setFavoriteItems(favItems);
        const map: Record<string, boolean> = {};
        favItems.forEach((item) => {
          const cat = menuData.categories.find((c) => c.name === item.category);
          map[item.id] =
            (cat?.hasTwoSizes && !!item.secondPrice && item.secondPrice > 0) ??
            false;
        });
        setHasTwoSizesMap(map);
      })
      .catch(console.error)
      .finally(() => setFavoritesLoading(false));
  }, [currentView, user]);

  // Reset verify message when panel closes or view changes
  useEffect(() => {
    if (!isOpen) setVerifyMessage(null);
  }, [isOpen]);

  useEffect(() => {
    setVerifyMessage(null);
  }, [currentView]);

  const navigateToView = (view: ProfileView) => {
    setCurrentView(view);
    setError(null);
    setSuccess(null);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log out.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (menuItemId: string) => {
    if (!user) return;
    setRemovingId(menuItemId);
    try {
      await removeFavorite(user.uid, menuItemId);
      setFavoriteItems((prev) => prev.filter((item) => item.id !== menuItemId));
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleSendVerification = async () => {
    setVerifyLoading(true);
    setVerifyMessage(null);
    try {
      await sendVerificationEmail();
      setVerifyMessage("Verification email sent! Check your inbox.");
    } catch (err: any) {
      setVerifyMessage(err.message || "Failed to send verification email.");
    } finally {
      setVerifyLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      {user ? (
        <div
          className="auth-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="auth-modal-header">
            <button
              className="back-button"
              onClick={() =>
                currentView !== "main" ? navigateToView("main") : onClose()
              }
              aria-label={currentView !== "main" ? "Back" : "Close"}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="currentColor"
                  d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                />
              </svg>
            </button>
            <h2 className="auth-modal-title">{VIEW_TITLES[currentView]}</h2>
          </div>

          <div className="auth-modal-content">
            {currentView === "main" && (
              <div className="user-info">
                <h3>Welcome, {userProfile?.firstName || user.displayName}!</h3>
                <p className="user-email">{user.email}</p>

                {isUnverified && (
                  <div className="verification-banner">
                    <p className="verification-banner-text">
                      Your account is not verified. Please check your inbox for
                      a verification email.
                    </p>
                    <div className="verification-banner-actions">
                      <button
                        className="verification-send-btn"
                        onClick={handleSendVerification}
                        disabled={verifyLoading}
                      >
                        {verifyLoading ? "Sending…" : "Send Verification Email"}
                      </button>
                    </div>
                    {verifyMessage && (
                      <p className="verification-feedback">{verifyMessage}</p>
                    )}
                  </div>
                )}

                {error &&
                  !error.toLowerCase().includes("permission") &&
                  !error.toLowerCase().includes("firestore") && (
                    <div className="error-message">{error}</div>
                  )}
                {success && <div className="success-message">{success}</div>}

                <div className="profile-menu">
                  {isAdmin ? (
                    <>
                      <button
                        className="profile-menu-item"
                        onClick={() => navigateToView("manageCalendar")}
                      >
                        <svg
                          className="menu-icon"
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                        >
                          <path
                            fill="currentColor"
                            d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
                          />
                        </svg>
                        <span>Manage Calendar</span>
                        <ChevronRight />
                      </button>
                      <button
                        className="profile-menu-item"
                        onClick={() => {
                          navigate("/analytics");
                          onClose();
                        }}
                      >
                        <svg
                          className="menu-icon"
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                        >
                          <path
                            fill="currentColor"
                            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"
                          />
                        </svg>
                        <span>Business Analytics</span>
                        <ChevronRight />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="profile-menu-item"
                        onClick={() => navigateToView("favorites")}
                      >
                        <svg
                          className="menu-icon"
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                        >
                          <path
                            fill="currentColor"
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                          />
                        </svg>
                        <span>My Favorites</span>
                        <ChevronRight />
                      </button>
                      <button
                        className="profile-menu-item"
                        onClick={() => navigateToView("orderHistory")}
                      >
                        <svg
                          className="menu-icon"
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                        >
                          <path
                            fill="currentColor"
                            d="M13 3a9 9 0 1 0 .001 18.001A9 9 0 0 0 13 3zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm.5-11H12v6l5.25 3.15.75-1.23-4.5-2.67V8z"
                          />
                        </svg>
                        <span>Order History</span>
                        <ChevronRight />
                      </button>
                    </>
                  )}

                  <button
                    className="profile-menu-item"
                    onClick={() => navigateToView("accountSettings")}
                  >
                    <svg
                      className="menu-icon"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                    >
                      <path
                        fill="currentColor"
                        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
                      />
                    </svg>
                    <span>Account Settings</span>
                    <ChevronRight />
                  </button>

                  <button
                    className="logout-button"
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    {loading ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            )}

            {currentView === "favorites" && (
              <FavoritesView
                favoriteItems={favoriteItems}
                favoritesLoading={favoritesLoading}
                removingId={removingId}
                hasTwoSizesMap={hasTwoSizesMap}
                onRemove={handleRemoveFavorite}
              />
            )}
            {currentView === "orderHistory" && (
              <OrderHistoryView
                orderHistory={orderHistory}
                ordersLoading={ordersLoading}
              />
            )}
            {currentView === "accountSettings" && <AccountSettingsView />}
            {currentView === "manageCalendar" && <ManageCalendarView />}
          </div>
        </div>
      ) : (
        <div
          className="auth-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="auth-modal-header">
            <button
              className="back-button"
              onClick={() => {
                if (currentView === "forgotPassword") {
                  setCurrentView("main");
                  setError(null);
                  setSuccess(null);
                } else {
                  onClose();
                }
              }}
              aria-label={currentView === "forgotPassword" ? "Back" : "Close"}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="currentColor"
                  d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                />
              </svg>
            </button>
            <h2 className="auth-modal-title">
              {currentView === "forgotPassword"
                ? "Reset Password"
                : "My Account"}
            </h2>
          </div>

          <div className="auth-modal-content">
            {currentView === "forgotPassword" ? (
              <ForgotPasswordForm
                onBack={() => {
                  setCurrentView("main");
                  setError(null);
                  setSuccess(null);
                }}
              />
            ) : (
              <LoginForm
                onClose={onClose}
                onForgotPassword={() => navigateToView("forgotPassword")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderAccount;
