import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BarChart3, 
  BookOpen, 
  Target, 
  Calculator, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Wallet,
  LogOut
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  metrics,
  currency,
  totalTradesCount,
  currentUser,
  onLogout
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'P&L Calendar', icon: Calendar, badge: 'Heatmap' },
    { id: 'analytics', label: 'Deep Analytics', icon: BarChart3, badge: 'Days & Assets' },
    { id: 'logbook', label: 'Trade Journal', icon: BookOpen, count: totalTradesCount },
    { id: 'strategies', label: 'Strategy Playbook', icon: Target, badge: 'Rules' },
    { id: 'calculator', label: 'Position Sizer', icon: Calculator, badge: 'Leverage' },
    { id: 'settings', label: 'Settings & Data', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        {!isCollapsed ? (
          <>
            <div className="brand-wrapper">
              <div className="brand-icon">
                <TrendingUp size={22} strokeWidth={2.5} />
              </div>
              <div className="brand-text">
                <span className="brand-title">TradeMatrix</span>
                <span className="brand-subtitle">Dark Crimson</span>
              </div>
            </div>
            <button 
              className="collapse-btn" 
              onClick={() => setIsCollapsed(true)}
              title="Collapse Navigation"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        ) : (
          <div className="sidebar-header-collapsed">
            <button 
              className="collapse-btn collapsed-toggle-btn" 
              onClick={() => setIsCollapsed(false)}
              title="Expand Navigation"
            >
              <ChevronRight size={18} />
            </button>
            <div 
              className="brand-icon collapsed-brand-icon" 
              onClick={() => setIsCollapsed(false)} 
              title="TradeMatrix AI (Click to expand)"
            >
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-menu">
        {!isCollapsed && <span className="nav-category">Navigation</span>}
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
            >
              <Icon size={19} />
              {!isCollapsed && (
                <>
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                  {item.count !== undefined && <span className="nav-badge">{item.count}</span>}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Snapshot & User Profile Footer */}
      {!isCollapsed ? (
        <div className="sidebar-footer">
          {/* Capital Pill */}
          <div className="account-pill">
            <div className="account-pill-label">
              <span>Account Capital</span>
              <Wallet size={14} />
            </div>
            <div className="account-pill-value">
              {formatCurrency(metrics.currentCapital, currency)}
            </div>
            <div className={`account-pill-pnl ${metrics.totalNetPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {metrics.totalNetPnl >= 0 ? '+' : ''}{metrics.roiPercent}% ({formatCurrency(metrics.totalNetPnl, currency)})
            </div>
          </div>

          {/* User Profile & Logout */}
          {currentUser && (
            <div className="user-profile-badge">
              <div className="user-info-text">
                <span className="user-name">{currentUser.name || 'Active Trader'}</span>
                <span className="user-email">{currentUser.email || 'trader@gmail.com'}</span>
              </div>
              <button 
                className="logout-btn" 
                onClick={onLogout}
                title="Sign Out of Terminal"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="sidebar-footer-collapsed">
          {currentUser && (
            <button 
              className="logout-btn collapsed-logout-btn" 
              onClick={onLogout}
              title="Sign Out of Terminal"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
