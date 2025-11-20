import { useState } from "react";
import { useAuth } from "../../context/authContext/authContext";
import "./headerAccount.css";

interface HeaderAccountProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileView = 'main' | 'favorites' | 'orderHistory' | 'accountSettings';

const HeaderAccount: React.FC<HeaderAccountProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, register, login, loginWithGoogle, logout, resendVerification, updateProfile, changeEmail, changePassword, getOrders } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ProfileView>('main');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: ''
  });

  const [settingsData, setSettingsData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!isLogin) {
      if (!formData.firstName || !formData.lastName) {
        setError('First name and last name are required');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        setSuccess('Successfully logged in!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber || undefined
        });
        setSuccess('Account created! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await loginWithGoogle();
      setSuccess('Successfully signed in with Google!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err.message !== 'Sign-in cancelled') {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await resendVerification();
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const updates: any = {};

      if (settingsData.firstName && settingsData.firstName !== userProfile?.firstName) {
        updates.firstName = settingsData.firstName;
      }
      if (settingsData.lastName && settingsData.lastName !== userProfile?.lastName) {
        updates.lastName = settingsData.lastName;
      }
      if (updates.firstName || updates.lastName) {
        updates.displayName = `${settingsData.firstName || userProfile?.firstName} ${settingsData.lastName || userProfile?.lastName}`;
      }

      if (settingsData.phoneNumber && settingsData.phoneNumber !== userProfile?.phoneNumber) {
        updates.phoneNumber = settingsData.phoneNumber;
      }

      if (settingsData.street || settingsData.city || settingsData.state || settingsData.zipCode) {
        updates.address = {
          street: settingsData.street || userProfile?.address?.street || '',
          city: settingsData.city || userProfile?.address?.city || '',
          state: settingsData.state || userProfile?.address?.state || '',
          zipCode: settingsData.zipCode || userProfile?.address?.zipCode || '',
          country: 'USA'
        };
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
        setSuccess('Profile updated successfully!');
      }

      if (settingsData.email && settingsData.email !== user?.email) {
        await changeEmail(settingsData.email);
        setSuccess('Email updated successfully! Please verify your new email.');
      }

      if (settingsData.newPassword) {
        if (settingsData.newPassword !== settingsData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await changePassword(settingsData.newPassword);
        setSuccess('Password updated successfully!');
        setSettingsData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to logout.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phoneNumber: ''
    });
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  };

  const navigateToView = (view: ProfileView) => {
    setCurrentView(view);
    setError(null);
    setSuccess(null);

    if (view === 'accountSettings' && userProfile) {
      setSettingsData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: user?.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        street: userProfile.address?.street || '',
        city: userProfile.address?.city || '',
        state: userProfile.address?.state || '',
        zipCode: userProfile.address?.zipCode || '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      {user ? (
        // Logged in view
        <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="auth-modal-header">
            {currentView !== 'main' ? (
              <button className="back-button" onClick={() => navigateToView('main')} aria-label="Back">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
            ) : (
              <button className="back-button" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
            )}
            <h2 className="auth-modal-title">
              {currentView === 'main' && 'My Account'}
              {currentView === 'favorites' && 'My Favorites'}
              {currentView === 'orderHistory' && 'Order History'}
              {currentView === 'accountSettings' && 'Account Settings'}
            </h2>
          </div>

          <div className="auth-modal-content">
            {currentView === 'main' && (
              <div className="user-info">
                <h3>Welcome, {userProfile?.firstName || user.displayName}!</h3>
                <p className="user-email">{user.email}</p>

                {!user.emailVerified && (
                  <div className="verification-banner">
                    <p>⚠️ Please verify your email address</p>
                    <button
                      onClick={handleResendVerification}
                      disabled={loading}
                      className="resend-button"
                    >
                      {loading ? 'Sending...' : 'Resend Verification Email'}
                    </button>
                  </div>
                )}

                {error && !error.toLowerCase().includes('permission') && !error.toLowerCase().includes('firestore') && (
                  <div className="error-message">{error}</div>
                )}
                {success && <div className="success-message">{success}</div>}

                <div className="profile-menu">
                  <button className="profile-menu-item" onClick={() => navigateToView('favorites')}>
                    <svg className="menu-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span>Favorites</span>
                    <svg className="chevron" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </button>

                  <button className="profile-menu-item" onClick={() => navigateToView('orderHistory')}>
                    <svg className="menu-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                    <span>Order History</span>
                    <svg className="chevron" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </button>

                  <button className="profile-menu-item" onClick={() => navigateToView('accountSettings')}>
                    <svg className="menu-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                    <span>Account Settings</span>
                    <svg className="chevron" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </button>

                  <button className="logout-button" onClick={handleLogout} disabled={loading}>
                    {loading ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            )}

            {currentView === 'favorites' && (
              <div className="favorites-view">
                <p className="empty-state">You haven't added any favorite dishes yet.</p>
                <p className="empty-state-hint">Browse our menu and click the heart icon to save your favorites!</p>
              </div>
            )}

            {currentView === 'orderHistory' && (
              <div className="order-history-view">
                <p className="empty-state">No orders yet.</p>
                <p className="empty-state-hint">Place your first order to see your order history here!</p>
              </div>
            )}

            {currentView === 'accountSettings' && (
              <div className="account-settings-view">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleUpdateSettings} className="settings-form">
                  <div className="settings-section">
                    <h4>Personal Information</h4>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={settingsData.firstName}
                          onChange={handleSettingsChange}
                          placeholder="Enter your first name"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={settingsData.lastName}
                          onChange={handleSettingsChange}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="phoneNumber">Phone Number</label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={settingsData.phoneNumber}
                        onChange={handleSettingsChange}
                        placeholder="(Optional)"
                      />
                    </div>
                  </div>

                  <div className="settings-section">
                    <h4>Primary Delivery Address</h4>

                    <div className="form-group">
                      <label htmlFor="street">Street Address</label>
                      <input
                        type="text"
                        id="street"
                        name="street"
                        value={settingsData.street}
                        onChange={handleSettingsChange}
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="city">City</label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={settingsData.city}
                          onChange={handleSettingsChange}
                          placeholder="Seattle"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="state">State</label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={settingsData.state}
                          onChange={handleSettingsChange}
                          placeholder="WA"
                          maxLength={2}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="zipCode">ZIP Code</label>
                        <input
                          type="text"
                          id="zipCode"
                          name="zipCode"
                          value={settingsData.zipCode}
                          onChange={handleSettingsChange}
                          placeholder="98101"
                          maxLength={5}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h4>Email & Password</h4>

                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={settingsData.email}
                        onChange={handleSettingsChange}
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={settingsData.newPassword}
                        onChange={handleSettingsChange}
                        placeholder="Leave blank to keep current password"
                      />
                      <small className="password-hint">Must be 6+ characters with uppercase, number, and special character</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={settingsData.confirmPassword}
                        onChange={handleSettingsChange}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Login/Register view
        <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="auth-modal-header">
            <button className="back-button" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <h2 className="auth-modal-title">{isLogin ? 'Sign In' : 'Create Account'}</h2>
          </div>

          <div className="auth-modal-content">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label htmlFor="firstName">
                      First Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                      required={!isLogin}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">
                      Last Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                      required={!isLogin}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number</label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="(Optional)"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="email">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password <span className="required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={isLogin ? "Enter your password" : "At least 6 characters"}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                      </svg>
                    )}
                  </button>
                </div>
                {!isLogin && (
                  <small className="password-hint">Must include uppercase, number, and special character</small>
                )}
              </div>

              {isLogin && (
                <div className="forgot-password">
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset functionality coming soon!');
                  }}>
                    Forgot Password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading
                  ? (isLogin ? 'Signing In...' : 'Creating Account...')
                  : (isLogin ? 'Sign In' : 'Create Account')
                }
              </button>
            </form>

            <div className="auth-toggle">
              <p>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  className="toggle-link"
                  onClick={toggleMode}
                  disabled={loading}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <div className="divider">
              <span>or</span>
            </div>

            <button
              className="google-signin-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? 'Signing in...' : `Continue with Google`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderAccount;