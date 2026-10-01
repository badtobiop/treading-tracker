import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import TradeLogbook from './components/TradeLogbook';
import StrategyVault from './components/StrategyVault';
import LotCalculator from './components/LotCalculator';
import LogTradeModal from './components/LogTradeModal';
import SettingsView from './components/SettingsView';
import FloatingAiWidget from './components/FloatingAiWidget';
import AuthPage from './components/AuthPage';
import StarfieldCanvas from './components/StarfieldCanvas';

import { INITIAL_TRADES, INITIAL_SETTINGS } from './data/initialData';
import { calculateMetrics } from './utils/calculations';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tradematrix_current_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Load trades from localStorage (Clean zero-data start)
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem('tradematrix_trades');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.some(t => t.id === 'tr-101')) {
          localStorage.removeItem('tradematrix_trades');
          return [];
        }
        return parsed;
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  // Load settings from localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('tradematrix_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.geminiApiKey && import.meta.env?.VITE_GEMINI_API_KEY) {
          parsed.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
        }
        return parsed;
      }
      return INITIAL_SETTINGS;
    } catch (e) {
      return INITIAL_SETTINGS;
    }
  });

  // Active view
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Trade Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Initialize Lenis Smooth Scroll on Window
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.5
    });

    let animationFrameId;
    function raf(time) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  // GSAP View Entrance Animations (Safe query with requestAnimationFrame)
  useEffect(() => {
    if (!currentUser) return;

    const rafId = requestAnimationFrame(() => {
      const view = document.querySelector('.view-container');
      if (view) {
        gsap.fromTo(
          view,
          { opacity: 0, y: 16, filter: 'blur(3px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.35, ease: 'power2.out' }
        );
      }

      const cards = document.querySelectorAll('.card, .kpi-card');
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
        );
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeTab, currentUser]);

  // Sync capital from user profile
  useEffect(() => {
    if (currentUser?.capital && currentUser.capital !== settings.initialCapital) {
      setSettings(prev => ({ ...prev, initialCapital: currentUser.capital }));
    }
  }, [currentUser]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tradematrix_trades', JSON.stringify(trades));
    } catch (e) {
      console.error('Failed to save trades to localStorage', e);
    }
  }, [trades]);

  useEffect(() => {
    try {
      localStorage.setItem('tradematrix_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [settings]);

  // Compute live metrics
  const metrics = calculateMetrics(trades, settings.initialCapital);

  // Trade actions
  const handleSaveTrade = (newTrade) => {
    setTrades(prev => [newTrade, ...prev]);
  };

  const handleDeleteTrade = (id) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleResetTrades = () => {
    setTrades([]);
    localStorage.removeItem('tradematrix_trades');
  };

  const handleImportTrades = (importedList) => {
    setTrades(importedList);
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
  };

  const handleLogout = () => {
    localStorage.removeItem('tradematrix_current_user');
    setCurrentUser(null);
  };

  return (
    <>
      {/* 3D Slow-Drifting Starfield in Background */}
      <StarfieldCanvas />

      {/* If not logged in, render AuthPage */}
      {!currentUser ? (
        <AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />
      ) : (
        <div className="app-container">
          {/* Left Sidebar (100% Fixed Anchor) */}
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            metrics={metrics}
            currency={settings.currency}
            totalTradesCount={trades.length}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Main Content Area */}
          <div className={`main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed-wrapper' : ''}`}>
            <Header 
              activeTab={activeTab}
              onOpenSettings={() => setActiveTab('settings')}
              metrics={metrics}
              currency={settings.currency}
            />

            <main>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  trades={trades}
                  metrics={metrics}
                  currency={settings.currency}
                  onNavigate={setActiveTab}
                  onOpenLogModal={() => setIsLogModalOpen(true)}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView 
                  trades={trades}
                  currency={settings.currency}
                  onSelectTrade={() => {}}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView 
                  trades={trades}
                  currency={settings.currency}
                />
              )}

              {activeTab === 'logbook' && (
                <TradeLogbook 
                  trades={trades}
                  currency={settings.currency}
                  onDeleteTrade={handleDeleteTrade}
                  onOpenLogModal={() => setIsLogModalOpen(true)}
                />
              )}

              {activeTab === 'strategies' && (
                <StrategyVault 
                  trades={trades}
                  currency={settings.currency}
                />
              )}

              {activeTab === 'calculator' && (
                <LotCalculator 
                  accountCapital={metrics.currentCapital}
                  currency={settings.currency}
                />
              )}

              {/* Clean dedicated Settings View (No modal overlap, fully visible) */}
              {activeTab === 'settings' && (
                <SettingsView 
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  trades={trades}
                  onResetTrades={handleResetTrades}
                  onImportTrades={handleImportTrades}
                />
              )}
            </main>
          </div>

          {/* Full Right-Side AI Drawer (Opens from right side, bottom chatbox, luxury chips) */}
          <FloatingAiWidget 
            trades={trades}
            onSaveTrade={handleSaveTrade}
            geminiApiKey={settings.geminiApiKey}
            currency={settings.currency}
          />

          {/* Manual / AI Log Modal */}
          <LogTradeModal 
            isOpen={isLogModalOpen}
            onClose={() => setIsLogModalOpen(false)}
            onSaveTrade={handleSaveTrade}
            accountCapital={metrics.currentCapital}
            currency={settings.currency}
            geminiApiKey={settings.geminiApiKey}
          />
        </div>
      )}
    </>
  );
}
