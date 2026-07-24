import React from 'react';
import { useNavigate } from 'react-router-dom';
import ZestBotLogo from '../../../assets/ZestBotLogo';
import './MainLayout.css';

const MainLayout = ({ children, user, logout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    console.log('[MainLayout] Logout button clicked');
    
    if (logout) {
      try {
        await logout();
        // Navigation will be handled by App.js
      } catch (error) {
        console.error('Logout error:', error);
        // Fallback if logout fails
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else {
      // fallback if logout prop not passed
      console.log('[MainLayout] No logout prop — fallback: clearing localStorage');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Get user display info from the user object (which comes from API or localStorage)
  const currentUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
      return null;
    }
  })();

  const displayName = currentUser?.name || currentUser?.userCode || 'User';
  const userCode = currentUser?.userCode || '';
  const userRole = currentUser?.role || 'Guest';

  return (
    <div className="dashboard-container">
      <div className="main-content">
        {/* Header */}
        <div className="top-header">
          <div className="header-brand">
            <div className="logo-container">
              <ZestBotLogo fill="#192A51" width={55} height={46} className="logo-icon-svg" />
            </div>
            <div className="header-divider"></div>
            <h1 className="header-title">
              Field Marketing Tracking System
            </h1>
          </div>
          
          <div className="header-actions">
            <div className="user-profile">
              <div className="user-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <div className="user-meta">
                  {userCode && (
                    <>
                      <span className="user-code">{userCode}</span>
                      <span className="user-separator">•</span>
                    </>
                  )}
                  <span className={`user-role role-${userRole.toLowerCase()}`}>{userRole.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout} 
              className="btn-logout-new"
              title="Logout"
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;