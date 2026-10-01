import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function Header({ 
  activeTab, 
  onOpenSettings,
  metrics,
  currency 
}) {
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Trading Performance Dashboard';
      case 'calendar': return 'Interactive P&L Calendar Heatmap';
      case 'analytics': return 'Deep Strategy & Day-of-Week Analytics';
      case 'logbook': return 'Trading Journal & Execution Log';
      case 'strategies': return 'Strategy Vault & Edge Tracking';
      case 'calculator': return 'Pre-Trade Lot & Risk Calculator';
      case 'copilot': return 'Gemini AI Trading Copilot';
      case 'settings': return 'System Settings & Data Backup';
      default: return 'TradeMatrix AI';
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="page-title">{getPageTitle()}</h1>
        <div className="header-badge">
          <span className="pulse-dot"></span>
          <span>Live Tracking Active</span>
        </div>
      </div>

      <div className="header-right">
        {/* Clean, minimalist header without cluttered top buttons (User Request) */}
        <button 
          className="btn-icon" 
          onClick={onOpenSettings} 
          title="Terminal Settings & Data Management"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </header>
  );
}
