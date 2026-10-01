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
import { 
  getUserTrades, 
  saveUserTrades, 
  resetUserTrades, 
  getUserSettings, 
  saveUserSettings 
} from './services/storageService';

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

  // Load isolated trades for the active user (100% separate per user)
  const [trades, setTrades] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tradematrix_current_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user ? getUserTrades(user) : [];
    } catch (e) {
      return [];
    }
  });

  // Load isolated settings for the active user
  const [settings, setSettings] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tradematrix_current_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user ? getUserSettings(user) : INITIAL_SETTINGS;
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

  // Save isolated trades exclusively for the active user
  useEffect(() => {
    if (currentUser) {
      saveUserTrades(currentUser, trades);
    }
  }, [trades, currentUser]);

  // Save isolated settings exclusively for the active user
  useEffect(() => {
    if (currentUser) {
      saveUserSettings(currentUser, settings);
    }
  }, [settings, currentUser]);

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
    if (currentUser) {
      resetUserTrades(currentUser);
    }
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
    setTrades([]);
    setSettings(INITIAL_SETTINGS);
    setActiveTab('dashboard');
  };

  const handleLoginSuccess = (user) => {
    const userTrades = getUserTrades(user);
    const userSettings = getUserSettings(user);
    setCurrentUser(user);
    setTrades(userTrades);
    setSettings(userSettings);
  };

  return (
    <>
      {/* 3D Slow-Drifting Starfield in Background */}
      <StarfieldCanvas />

      {/* If not logged in, render AuthPage */}
      {!currentUser ? (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
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
