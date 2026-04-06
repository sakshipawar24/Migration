import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Navigation.css';

function Navigation({ authConnected, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>PBIP</h2>
        </div>
        
        {authConnected && (
          <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
            <span className={`hamburger-icon ${isMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        )}
        
        {authConnected && (
          <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            <li>
              <Link 
                to="/operations" 
                className={`nav-link ${isActive('/operations') ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">Operations</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/connections" 
                className={`nav-link ${isActive('/connections') ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span className="nav-icon">🔗</span>
                <span className="nav-label">Connections</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/metadata" 
                className={`nav-link ${isActive('/metadata') ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-label">Metadata</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/summary" 
                className={`nav-link ${isActive('/summary') ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span className="nav-icon">📋</span>
                <span className="nav-label">Summary</span>
              </Link>
            </li>
            <li>
              <button className="logout-btn" onClick={handleLogout}>
                <span className="logout-icon">🚪</span>
                <span className="logout-label">Logout</span>
              </button>
            </li>
          </ul>
        )}
      </div>
      {isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}
    </nav>
  );
}

export default Navigation;
