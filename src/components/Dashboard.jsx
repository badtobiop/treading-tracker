import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  DollarSign, 
  Award, 
  CalendarDays, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight,
  Flame,
  Zap,
  Plus,
  Sparkles,
  Target,
  AlertTriangle,
  Scissors
} from 'lucide-react';
import { formatCurrency, formatTradeTime, calculateDayOfWeekStats, calculateAssetStats } from '../utils/calculations';
import MistakeNoteModal from './MistakeNoteModal';

export default function Dashboard({ 
  trades, 
  metrics, 
  currency, 
  onNavigate, 
  onOpenLogModal,
  onUpdateTrade
}) {
  const [tradeToClose, setTradeToClose] = useState(null);
  const [customExitPrice, setCustomExitPrice] = useState('');
  const [tradeToEditMistake, setTradeToEditMistake] = useState(null);
  const [settleRR, setSettleRR] = useState(1.5);
  const [settleReason, setSettleReason] = useState('Time Ran Out / Session Close');
  const [customSettleReasonInput, setCustomSettleReasonInput] = useState('');

  const settleModalRef = useRef(null);
  const settleOverlayRef = useRef(null);

  // Smooth GSAP Settle Modal Animation
  useEffect(() => {
    if (tradeToClose && settleModalRef.current && settleOverlayRef.current) {
      gsap.killTweensOf([settleOverlayRef.current, settleModalRef.current]);
      gsap.fromTo(settleOverlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(settleModalRef.current, 
        { opacity: 0, scale: 0.94, y: 12 }, 
        { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }
  }, [tradeToClose]);

  const handleCloseSettleModal = () => {
    if (settleModalRef.current && settleOverlayRef.current) {
      gsap.killTweensOf([settleOverlayRef.current, settleModalRef.current]);
      gsap.to(settleOverlayRef.current, { opacity: 0, duration: 0.15, ease: 'power2.in' });
      gsap.to(settleModalRef.current, { 
        opacity: 0, 
        scale: 0.95, 
        y: 8, 
        duration: 0.15, 
        ease: 'power2.in', 
        onComplete: () => setTradeToClose(null) 
      });
    } else {
      setTradeToClose(null);
    }
  };

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (tradeToClose || tradeToEditMistake) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [tradeToClose, tradeToEditMistake]);

  // Handle Settle / Close Open Trade from Dashboard
  const handleSettleTrade = (trade, outcomeType, overrideValue = null, exitReason = '') => {
    if (!trade) return;
    const entry = parseFloat(trade.entryPrice) || 0;
    const sl = parseFloat(trade.stopLoss) || 0;
    const tp = parseFloat(trade.takeProfit) || 0;
    const qty = parseFloat(trade.lotSize) || 1.0;
    const isBuy = trade.type === 'BUY';

    let exit = 0;
    let pnl = 0;
    let finalOutcome = outcomeType;
    let realizedRR = trade.realizedRR || null;

    if (outcomeType === 'TP_HIT') {
      exit = tp > 0 ? tp : entry;
      const points = isBuy ? (exit - entry) : (entry - exit);
      pnl = parseFloat((qty * points).toFixed(2));
      finalOutcome = 'TP_HIT';
    } else if (outcomeType === 'SL_HIT') {
      exit = sl > 0 ? sl : entry;
      const points = isBuy ? (exit - entry) : (entry - exit);
      pnl = parseFloat((qty * points).toFixed(2));
      finalOutcome = 'SL_HIT';
    } else if (outcomeType === 'BREAKEVEN') {
      exit = entry;
      pnl = 0;
      finalOutcome = 'BREAKEVEN';
    } else if (outcomeType === 'CUSTOM_RR') {
      const rVal = parseFloat(overrideValue !== null ? overrideValue : settleRR) || 1.0;
      realizedRR = rVal;
      const riskPerUnit = sl > 0 ? Math.abs(entry - sl) : 0;
      if (riskPerUnit > 0) {
        exit = isBuy ? (entry + (riskPerUnit * rVal)) : (entry - (riskPerUnit * rVal));
        pnl = parseFloat((qty * riskPerUnit * rVal).toFixed(2));
      } else {
        exit = entry;
        pnl = 0;
      }
      finalOutcome = 'CUSTOM_RR';
    } else if (outcomeType === 'CUSTOM') {
      exit = parseFloat(overrideValue !== null ? overrideValue : customExitPrice) || entry;
      const points = isBuy ? (exit - entry) : (entry - exit);
      pnl = parseFloat((qty * points).toFixed(2));
      if (pnl > 0) finalOutcome = 'TP_HIT';
      else if (pnl < 0) finalOutcome = 'SL_HIT';
      else finalOutcome = 'BREAKEVEN';
    }

    const updatedTrade = {
      ...trade,
      exitPrice: parseFloat(Number(exit).toFixed(3)),
      outcome: finalOutcome,
      pnl: pnl,
      realizedRR: realizedRR,
      riskRewardRatio: finalOutcome === 'CUSTOM_RR' && realizedRR ? `1:${realizedRR.toFixed(2)}` : trade.riskRewardRatio,
      earlyExitReason: exitReason || customSettleReasonInput.trim() || settleReason || trade.earlyExitReason || '',
      closedAt: new Date().toISOString()
    };

    if (onUpdateTrade) {
      onUpdateTrade(updatedTrade);
    }

    if (pnl > 0 || finalOutcome === 'TP_HIT' || finalOutcome === 'CUSTOM_RR') {
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.8 } });
    }

    setTradeToClose(null);
    setCustomExitPrice('');

    // ONLY if Stop Loss was strictly hit, prompt trader to record their mistake (NEVER on TP Hit or positive R:R)
    if (finalOutcome === 'SL_HIT' && pnl < 0) {
      setTimeout(() => {
        setTradeToEditMistake(updatedTrade);
      }, 300);
    }
  };

  const dayStats = calculateDayOfWeekStats(trades);
  const assetStats = calculateAssetStats(trades);

  // Outcome statistics for Monthly Progress
  const tpHitTrades = trades.filter(t => t.outcome === 'TP_HIT' || (Number(t.pnl) > 0 && !t.outcome));
  const slHitTrades = trades.filter(t => t.outcome === 'SL_HIT' || (Number(t.pnl) < 0 && !t.outcome));
  const totalDecided = tpHitTrades.length + slHitTrades.length;
  const targetHitRate = totalDecided > 0 ? ((tpHitTrades.length / totalDecided) * 100).toFixed(1) : 0;

  // Recent 5 trades
  const recentTrades = [...trades]
    .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`))
    .slice(0, 5);

  // Generate SVG Equity Curve points
  const generateEquityPoints = () => {
    const initialCap = metrics.currentCapital - metrics.totalNetPnl;
    if (trades.length === 0) {
      return { 
        pathData: 'M 20 90 L 780 90', 
        areaData: 'M 20 90 L 780 90 L 780 180 L 20 180 Z', 
        points: [{ x: 20, y: 90, val: initialCap }, { x: 780, y: 90, val: initialCap }] 
      };
    }
    
    // Sort chronologically
    const sorted = [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));
    
    let balance = initialCap;
    const balances = [balance];
    sorted.forEach(t => {
      balance += (Number(t.pnl) || 0);
      balances.push(balance);
    });

    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = max - min || 1;
    
    const width = 800;
    const height = 180;
    const padding = 20;

    const points = balances.map((val, idx) => {
      const x = padding + (idx / (balances.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return { x, y, val };
    });

    const pathData = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

    return { pathData, areaData, points };
  };

  const { pathData, areaData, points } = generateEquityPoints();

  return (
    <div className="view-container">
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Net PnL */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Net Cumulative P&L</span>
            <div className="kpi-icon-wrapper">
              {metrics.totalNetPnl >= 0 ? <TrendingUp size={18} className="text-profit" /> : <TrendingDown size={18} className="text-loss" />}
            </div>
          </div>
          <div className={`kpi-value ${metrics.totalNetPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {formatCurrency(metrics.totalNetPnl, currency)}
          </div>
          <div className="kpi-subtext">
            <span className={metrics.roiPercent >= 0 ? 'text-profit' : 'text-loss'}>
              {metrics.roiPercent >= 0 ? '+' : ''}{metrics.roiPercent}% Return on Capital
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Win Rate Ratio</span>
            <div className="kpi-icon-wrapper">
              <Percent size={18} className="text-profit" />
            </div>
          </div>
          <div className="kpi-value">
            {metrics.winRate}%
          </div>
          <div className="kpi-subtext">
            <span className="text-profit">{metrics.winTrades} Wins</span>
            <span>•</span>
            <span className="text-loss">{metrics.lossTrades} Losses</span>
            <span>({metrics.totalTrades} Total)</span>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Profit Factor</span>
            <div className="kpi-icon-wrapper">
              <Award size={18} style={{ color: '#818cf8' }} />
            </div>
          </div>
          <div className="kpi-value">
            {metrics.profitFactor}
          </div>
          <div className="kpi-subtext">
            <span>+{formatCurrency(metrics.totalProfit, currency)} / -{formatCurrency(metrics.totalLoss, currency)}</span>
          </div>
        </div>

        {/* Best Day of Week */}
        <div className="kpi-card" style={{ borderColor: 'rgba(147, 128, 255, 0.4)' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: 'var(--accent-amethyst)' }}>Top Profitable Day</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(147, 128, 255, 0.15)', color: 'var(--accent-amethyst)' }}>
              <Flame size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-amethyst)' }}>
            {dayStats.bestDay || 'Pending Trades'}
          </div>
          <div className="kpi-subtext">
            <span>Highest Edge Day of Week</span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Max Drawdown</span>
            <div className="kpi-icon-wrapper">
              <ShieldAlert size={18} className="text-loss" />
            </div>
          </div>
          <div className="kpi-value text-loss">
            {metrics.maxDrawdownPercent}%
          </div>
          <div className="kpi-subtext">
            <span>Peak-to-Trough Capital Risk</span>
          </div>
        </div>

        {/* Target (TP) Hit Rate */}
        <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: 'var(--profit)' }}>Target (TP) Hit Rate</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--profit)' }}>
              <Target size={18} />
            </div>
          </div>
          <div className="kpi-value text-profit">
            {targetHitRate}%
          </div>
          <div className="kpi-subtext">
            <span>🎯 {tpHitTrades.length} TP Hit • 🛑 {slHitTrades.length} SL Hit</span>
          </div>
        </div>
      </div>

      {/* Equity Curve & Day-of-Week Snapshot Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Equity Curve Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <TrendingUp size={20} className="text-profit" />
                Portfolio Equity Growth Trajectory
              </h2>
              <span className="card-subtitle">Account compounding curve across recorded executions</span>
            </div>
            <span className="badge-profit" style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
              Current Capital: {formatCurrency(metrics.currentCapital, currency)}
            </span>
          </div>

          <div style={{ width: '100%', height: '210px', position: 'relative', marginTop: '10px' }}>
            <svg 
              viewBox="0 0 800 180" 
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9380ff" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="40" x2="780" y2="40" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4" />
              <line x1="20" y1="90" x2="780" y2="90" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4" />
              <line x1="20" y1="140" x2="780" y2="140" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4" />

              {/* Area & Stroke */}
              {areaData && <path d={areaData} fill="url(#equityGrad)" />}
              {pathData && (
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke="url(#lineGrad)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))' }}
                />
              )}

              {/* Interactive Dots */}
              {points.map((p, idx) => (
                <circle 
                  key={idx} 
                  cx={p.x} 
                  cy={p.y} 
                  r={idx === points.length - 1 ? 5 : 3.5} 
                  fill={idx === points.length - 1 ? '#38bdf8' : '#10b981'} 
                  stroke="#07090e" 
                  strokeWidth="2" 
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Day-of-Week Mini Heatmap Widget */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <CalendarDays size={19} style={{ color: 'var(--accent-amethyst)' }} />
                Weekday Edge Distribution
              </h2>
              <span className="card-subtitle">Performance breakdown by trading day</span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => onNavigate('analytics')}
            >
              Full Analytics
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {dayStats.days.filter(d => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(d.name)).map(day => {
              const isBest = day.name === dayStats.bestDay;
              return (
                <div 
                  key={day.name} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isBest ? 'rgba(147, 128, 255, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                    border: isBest ? '1px solid rgba(147, 128, 255, 0.35)' : '1px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{day.short}</span>
                    {isBest && <span className="best-day-badge" style={{ position: 'static' }}>BEST</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{day.winRate}% Win</span>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 700, 
                        fontSize: '0.9rem',
                        color: day.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                      }}
                    >
                      {formatCurrency(day.totalPnl, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Asset Performance Preview & Recent Trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Asset Performance Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Zap size={19} style={{ color: '#fbbf24' }} />
                Asset Breakdown
              </h2>
              <span className="card-subtitle">Gold vs Crypto vs Forex</span>
            </div>
          </div>

          {assetStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No market positions logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {assetStats.slice(0, 4).map(asset => (
                <div 
                  key={asset.asset}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div className="asset-badge">{asset.asset}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {asset.totalTrades} Positions • {asset.winRate}% Win Rate
                    </div>
                  </div>
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700, 
                      fontSize: '0.95rem',
                      color: asset.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                    }}
                  >
                    {formatCurrency(asset.totalPnl, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades Table / Clean Professional English Empty State */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <ArrowUpRight size={19} className="text-profit" />
                Recent Executions
              </h2>
              <span className="card-subtitle">Latest recorded trading activity</span>
            </div>
            {trades.length > 0 && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => onNavigate('logbook')}
              >
                View All ({trades.length})
              </button>
            )}
          </div>

          {trades.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Sparkles size={24} />
              </div>
              <h3 className="empty-state-title">Your Trading Journal is Clean & Ready</h3>
              <p className="empty-state-desc">
                No market positions have been recorded yet. Click below to log your first trade manually, or use the <strong>Gemini AI Copilot</strong> in the bottom right corner to dictate your position.
              </p>
              <button className="btn btn-primary" onClick={onOpenLogModal} style={{ marginTop: '8px' }}>
                <Plus size={16} />
                <span>Record Your First Trade</span>
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="trade-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Entry / Exit</th>
                    <th>R:R</th>
                    <th>Strategy</th>
                    <th style={{ textAlign: 'right' }}>Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map(trade => (
                    <tr key={trade.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trade.date}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{trade.time || formatTradeTime(trade)}</div>
                      </td>
                      <td>
                        <span className="asset-badge">{trade.asset}</span>
                      </td>
                      <td>
                        <span className={`trade-type-pill ${trade.type.toLowerCase()}`}>
                          {trade.type}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {trade.entryPrice} → {trade.exitPrice}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {trade.riskRewardRatio || '2.0:1'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {trade.strategy || 'Discretionary'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span 
                          style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: 700, 
                            fontSize: '0.92rem',
                            color: trade.outcome === 'OPEN' ? 'var(--accent-cyan)' : trade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                          }}
                        >
                          {trade.outcome === 'OPEN' ? 'OPEN' : formatCurrency(trade.pnl, currency)}
                        </span>
                        {trade.outcome === 'TP_HIT' && (
                          <div>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--profit)', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                              🎯 TP HIT
                            </span>
                          </div>
                        )}
                        {trade.outcome === 'SL_HIT' && (
                          <div>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--loss)', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                              🛑 SL HIT
                            </span>
                          </div>
                        )}
                        {trade.outcome === 'BREAKEVEN' && (
                          <div>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                              ⚖️ BREAKEVEN
                            </span>
                          </div>
                        )}
                        {trade.outcome === 'CUSTOM_RR' && (
                          <div>
                            <span 
                              style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--profit)', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}
                              title={trade.earlyExitReason ? `Exit Reason: ${trade.earlyExitReason}` : undefined}
                            >
                              ✂️ 1:{trade.realizedRR ? Number(trade.realizedRR).toFixed(2) : (trade.riskRewardRatio ? trade.riskRewardRatio.replace('1:', '') : '1.0')} EXIT
                            </span>
                          </div>
                        )}
                        {trade.outcome === 'OPEN' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-block' }}>
                              ⏳ OPEN
                            </span>
                            <button
                              type="button"
                              onClick={() => setTradeToClose(trade)}
                              style={{
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                background: 'rgba(56, 189, 248, 0.2)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.45)',
                                borderRadius: '4px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="Position completed? Record TP or SL!"
                            >
                              ⚡ Settle
                            </button>
                          </div>
                        )}

                        {/* Mistake Note Tag / Log Mistake Button */}
                        {trade.mistakeNote ? (
                          <div>
                            <div 
                              onClick={() => setTradeToEditMistake(trade)}
                              style={{
                                cursor: 'pointer',
                                marginTop: '3px',
                                padding: '2px 6px',
                                background: 'rgba(244, 63, 94, 0.12)',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                borderRadius: '4px',
                                color: '#fca5a5',
                                fontSize: '0.67rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                maxWidth: '140px',
                                textAlign: 'left'
                              }}
                              title={`Mistake Note: "${trade.mistakeNote}" (Click to edit)`}
                            >
                              <span>⚠️</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {trade.mistakeNote}
                              </span>
                            </div>
                          </div>
                        ) : (
                          // ONLY show on SL_HIT or loss trades, NEVER on TP_HIT or OPEN trades!
                          (trade.pnl < 0 || trade.outcome === 'SL_HIT') && trade.outcome !== 'OPEN' && trade.outcome !== 'TP_HIT' && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setTradeToEditMistake(trade)}
                                style={{
                                  marginTop: '3px',
                                  padding: '2px 6px',
                                  background: 'rgba(244, 63, 94, 0.12)',
                                  border: '1px dashed rgba(244, 63, 94, 0.45)',
                                  borderRadius: '4px',
                                  color: '#fda4af',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                                title="Click to log trade mistake and reason for Stop-Loss trigger"
                              >
                                <span>⚠️</span> Log Mistake
                              </button>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Settle Open Trade Quick Modal */}
      {tradeToClose && (
        <div 
          ref={settleOverlayRef}
          className="modal-overlay" 
          data-lenis-prevent="true" 
          onClick={handleCloseSettleModal}
          onWheel={e => e.stopPropagation()}
        >
          <div 
            ref={settleModalRef}
            className="modal-content" 
            data-lenis-prevent="true" 
            onClick={e => e.stopPropagation()} 
            onWheel={e => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="asset-badge" style={{ fontSize: '1.1rem' }}>{tradeToClose.asset}</span>
                <span className={`trade-type-pill ${tradeToClose.type.toLowerCase()}`}>
                  {tradeToClose.type}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Close & Settle Open Position</h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Entry: {tradeToClose.entryPrice} | Lots: {tradeToClose.lotSize}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={handleCloseSettleModal}>✕</button>
            </div>

            <div 
              className="modal-body" 
              data-lenis-prevent="true" 
              onWheel={e => e.stopPropagation()}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}
            >
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Did this trade conclude in the market? Select whether <strong>Target (TP) was hit or Stop Loss (SL) triggered</strong>:
              </p>

              {/* 3 Outcome Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {/* 1. 🎯 TP HIT */}
                <button
                  type="button"
                  onClick={() => handleSettleTrade(tradeToClose, 'TP_HIT')}
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '2px solid var(--profit)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🎯</span>
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--profit)', display: 'block' }}>
                        Take Profit (TP) Hit!
                      </strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Take Profit Price: <strong>{tradeToClose.takeProfit || 'TP'}</strong>
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--profit)', fontWeight: 800 }}>
                      +{currency}
                      {tradeToClose.takeProfit && tradeToClose.entryPrice
                        ? (Math.abs(parseFloat(tradeToClose.takeProfit) - parseFloat(tradeToClose.entryPrice)) * (parseFloat(tradeToClose.lotSize) || 1)).toFixed(0)
                        : 'Profit'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--profit)', display: 'block' }}>RECORD PROFIT</span>
                  </div>
                </button>

                {/* 2. 🛑 SL HIT */}
                <button
                  type="button"
                  onClick={() => handleSettleTrade(tradeToClose, 'SL_HIT')}
                  style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '2px solid var(--loss)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🛑</span>
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--loss)', display: 'block' }}>
                        Stop Loss (SL) Hit!
                      </strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Stop Loss Price: <strong>{tradeToClose.stopLoss || 'SL'}</strong>
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--loss)', fontWeight: 800 }}>
                      -{currency}
                      {tradeToClose.stopLoss && tradeToClose.entryPrice
                        ? (Math.abs(parseFloat(tradeToClose.entryPrice) - parseFloat(tradeToClose.stopLoss)) * (parseFloat(tradeToClose.lotSize) || 1)).toFixed(0)
                        : 'Loss'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--loss)', display: 'block' }}>RECORD LOSS</span>
                  </div>
                </button>

                {/* 3. ⚖️ BREAKEVEN */}
                <button
                  type="button"
                  onClick={() => handleSettleTrade(tradeToClose, 'BREAKEVEN')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>⚖️</span>
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                        Breakeven (Cost-to-Cost Exit)
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Exit Price: {tradeToClose.entryPrice}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {currency}0.00
                  </span>
                </button>

                {/* 4. ✂️ CUSTOM R:R / EARLY EXIT */}
                {(() => {
                  const closeEntry = parseFloat(tradeToClose.entryPrice) || 0;
                  const closeSL = parseFloat(tradeToClose.stopLoss) || 0;
                  const closeQty = parseFloat(tradeToClose.lotSize) || 1.0;
                  const closeRisk = closeSL > 0 ? Math.abs(closeEntry - closeSL) : 0;
                  const closeIsBuy = tradeToClose.type === 'BUY';
                  const calcExit = closeRisk > 0 ? (closeIsBuy ? (closeEntry + closeRisk * settleRR) : (closeEntry - closeRisk * settleRR)) : closeEntry;
                  const calcProfit = closeRisk > 0 ? (closeQty * closeRisk * settleRR) : 0;

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
                      border: '1.5px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.6rem' }}>✂️</span>
                          <div>
                            <strong style={{ fontSize: '0.94rem', color: '#10b981', display: 'block' }}>
                              Early Exit at Realized R:R
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Closed before target hit? Pick your actual exit R:R:
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.94rem', color: '#10b981', fontWeight: 800 }}>
                            +{currency}{calcProfit > 0 ? calcProfit.toFixed(0) : 'Profit'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                            Exit: {calcExit > 0 ? calcExit.toFixed(2) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(ratio => {
                          const isSelected = Math.abs(settleRR - ratio) < 0.01;
                          return (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setSettleRR(ratio)}
                              style={{
                                padding: '4px 9px',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                                color: isSelected ? '#10b981' : 'var(--text-secondary)',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              1:{ratio === 1 || ratio === 2 ? `${ratio}.0` : ratio}
                              {isSelected && ' ✓'}
                            </button>
                          );
                        })}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Custom R:</span>
                          <input 
                            type="number"
                            step="0.1"
                            value={settleRR}
                            onChange={e => setSettleRR(parseFloat(e.target.value) || 1.0)}
                            style={{
                              width: '56px',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              background: 'rgba(0, 0, 0, 0.4)',
                              color: '#10b981',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              textAlign: 'center'
                            }}
                          />
                        </div>
                      </div>

                      {/* Reasons */}
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Exit Reason:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {['⏰ Time Ran Out / Session Close', '⏸️ Momentum Stalling', '🔒 Locked Profit', '🛡️ Trailing Exit'].map(reason => {
                            const isReasonActive = (customSettleReasonInput === reason) || (!customSettleReasonInput && settleReason === reason);
                            return (
                              <button
                                key={reason}
                                type="button"
                                onClick={() => {
                                  setSettleReason(reason);
                                  setCustomSettleReasonInput(reason);
                                }}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  border: isReasonActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                  background: isReasonActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                  color: isReasonActive ? '#38bdf8' : 'var(--text-secondary)'
                                }}
                              >
                                {reason}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSettleTrade(tradeToClose, 'CUSTOM_RR', settleRR, customSettleReasonInput.trim() || settleReason)}
                        style={{
                          width: '100%',
                          padding: '9px 14px',
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.84rem'
                        }}
                      >
                        Close Trade at 1:{settleRR} R:R (+{currency}{calcProfit > 0 ? calcProfit.toFixed(0) : 'Profit'})
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* 4. Custom Exit Price */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Or closed at a custom exit price?
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input"
                    placeholder={`e.g. ${tradeToClose.entryPrice}`}
                    value={customExitPrice}
                    onChange={e => setCustomExitPrice(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.84rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '7px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      if (!customExitPrice) {
                        alert('Please enter an exit price!');
                        return;
                      }
                      handleSettleTrade(tradeToClose, 'CUSTOM', customExitPrice);
                    }}
                  >
                    Close At Price
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseSettleModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mistake Note & Post-Mortem Modal */}
      <MistakeNoteModal 
        isOpen={!!tradeToEditMistake}
        trade={tradeToEditMistake}
        onClose={() => setTradeToEditMistake(null)}
        onSave={(updated) => {
          if (onUpdateTrade) onUpdateTrade(updated);
        }}
        currency={currency}
      />
    </div>
  );
}
