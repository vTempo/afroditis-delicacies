import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/authContext/authContext";
import "./headerAccount.css";

interface HeaderAccountProps {
  isOpen: boolean;
  onClose: () => void;
}

const HeaderAccount: React.FC<HeaderAccountProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement Firebase authentication with your partner
    console.log('Form submitted:', formData);
    console.log('Mode:', isLogin ? 'Login' : 'Sign Up');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Reset form when switching modes
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: ''
    });
    setShowPassword(false);
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      { user ? (
        <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="auth-modal-header">
            <button className="back-button" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <h2 className="auth-modal-title">{ "Hello User Name!" }</h2>
          </div>
        </div>
      ) : (
        <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
          {/* Header with back arrow and title */}
          <div className="auth-modal-header">
            <button className="back-button" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <h2 className="auth-modal-title">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
          </div>

          {/* Auth Form */}
          <div className="auth-modal-content">
              <form onSubmit={handleSubmit} className="auth-form">
                {/* Sign Up Only Fields */}
                {!isLogin && (
                  <>
                    <div className="form-group">
                      <label htmlFor="firstName">
                        FIRST NAME <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">
                        LAST NAME <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </>
                )}

                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="email">
                    EMAIL <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="form-group">
                  <label htmlFor="password">
                    PASSWORD <span className="required">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        {showPassword ? (
                          // Eye with slash (hide password)
                          <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                        ) : (
                          // Eye (show password)
                          <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>



                {/* Forgot Password (Login Only) */}
                {isLogin && (
                  <div className="forgot-password">
                    <a href="/forgot-password">Forgot your password?</a>
                  </div>
                )}

                {/* Submit Button */}
                <button type="submit" className="submit-button">
                  {isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
                </button>
              </form>

              {/* Toggle between Login and Sign Up */}
              <div className="auth-toggle">
                <p>
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button type="button" onClick={toggleMode} className="toggle-link">
                      {isLogin ? 'Sign Up' : 'Login'}
                  </button>
                </p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderAccount;