// Sidebar component for layout navigation
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('billbook_username') || 'admin';

  const handleLogout = () => {
    localStorage.removeItem('billbook_token');
    localStorage.removeItem('billbook_username');
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="logo-section">
        <h2 className="logo-title">BillBook</h2>
        <div className="logo-subtitle">smart business billing</div>
      </div>
      
      <div className="nav-menu">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/invoices" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Invoices
        </NavLink>
        <NavLink 
          to="/clients" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Clients
        </NavLink>
        <NavLink 
          to="/admin" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Database Admin
        </NavLink>
      </div>

      <div className="logout-btn-container">
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold' }}>
          User: {username}
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
