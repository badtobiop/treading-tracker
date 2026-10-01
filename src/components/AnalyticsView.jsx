import React, { useState } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Flame, 
  AlertTriangle, 
  Coins, 
  Clock, 
  HeartHandshake, 
  TrendingUp, 
  TrendingDown, 
  Award,
  Zap,
  Filter
} from 'lucide-react';
import { 
  calculateDayOfWeekStats, 
  calculateAssetStats, 
  calculateStrategyStats, 
  formatCurrency 
} from '../utils/calculations';

export default function AnalyticsView({ trades, currency }) {
  const [assetFilter, setAssetFilter] = useState('ALL');
  
  const filteredTrades = assetFilter === 'ALL' 
    ? trades 
    : trades.filter(t => t.asset === assetFilter);

  const dayStats = calculateDayOfWeekStats(filteredTrades);
  const assetStats = calculateAssetStats(trades);
  const strategyStats = calculateStrategyStats(filteredTrades);

  // Identify Worst Day by total PnL
  let worstDay = null;
  let minPnl = Infinity;
  dayStats.days.forEach(d => {
    if (d.totalTrades > 0 && d.totalPnl < minPnl) {
      minPnl = d.totalPnl;
      worstDay = d.name;
    }
  });

  // Calculate Discipline / Psychology stats
  const rulesFollowedTrades = filteredTrades.filter(t => t.rulesFollowed);
  const rulesBrokenTrades = filteredTrades.filter(t => !t.rulesFollowed);

  const followedPnl = rulesFollowedTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const brokenPnl = rulesBrokenTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);

  // Session stats
  const sessionStats = {
    London: { trades: 0, pnl: 0, wins: 0 },
    'New York': { trades: 0, pnl: 0, wins: 0 },
    Asian: { trades: 0, pnl: 0, wins: 0 }
  };

  filteredTrades.forEach(t => {
    const s = t.session || 'New York';
    if (sessionStats[s]) {
      sessionStats[s].trades++;
      const pnl = Number(t.pnl) || 0;
      sessionStats[s].pnl += pnl;
      if (pnl > 0) sessionStats[s].wins++;
    }
  });

  // Max PnL across days for bar scaling
  const maxAbsPnl = Math.max(...dayStats.days.map(d => Math.abs(d.totalPnl)), 100);

  return (
    <div className="view-container">
      {/* Asset Filter Pills */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={17} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter Analytics by Asset:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className={`btn btn-secondary ${assetFilter === 'ALL' ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '0.8rem', background: assetFilter === 'ALL' ? 'rgba(6, 182, 212, 0.2)' : undefined }}
              onClick={() => setAssetFilter('ALL')}
            >
              All Assets ({trades.length})
            </button>
            {assetStats.map(a => (
              <button
                key={a.asset}
                className={`btn btn-secondary ${assetFilter === a.asset ? 'active' : ''}`}
                style={{ padding: '5px 12px', fontSize: '0.8rem', background: assetFilter === a.asset ? 'rgba(6, 182, 212, 0.2)' : undefined }}
                onClick={() => setAssetFilter(a.asset)}
              >
                {a.asset} ({a.totalTrades})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Highlight: Day of Week Analytics (Direct User Request) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Calendar size={22} style={{ color: 'var(--accent-cyan)' }} />
              Day-of-Week Performance Breakdown
            </h2>
            <span className="card-subtitle">
              Discover which day of the week yields your highest statistical profit and lowest risk
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {dayStats.bestDay && (
              <div className="badge-profit" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
                <Flame size={15} />
                <span>Best Day: <strong>{dayStats.bestDay}</strong></span>
              </div>
            )}
            {worstDay && minPnl < 0 && (
              <div className="badge-loss" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
                <AlertTriangle size={15} />
                <span>Weakest Day: <strong>{worstDay}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* 7 Days Cards Grid */}
        <div className="day-analytics-grid">
          {dayStats.days.map(day => {
            const isBest = day.name === dayStats.bestDay;
            const isWorst = day.name === worstDay && minPnl < 0;

            return (
              <div 
                key={day.name} 
                className={`day-card ${isBest ? 'best-day' : ''}`}
                style={{
                  borderColor: isBest ? 'var(--accent-cyan)' : isWorst ? 'rgba(244, 63, 94, 0.4)' : undefined
                }}
              >
                {isBest && <span className="best-day-badge">TOP EDGE</span>}
                {isWorst && (
                  <span className="best-day-badge" style={{ color: 'var(--loss)', borderColor: 'var(--loss-border)', background: 'var(--loss-bg)' }}>
                    CAUTION
                  </span>
                )}

                <span className="day-name">{day.name}</span>
                
                <div 
                  className="day-pnl"
                  style={{ color: day.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}
                >
                  {formatCurrency(day.totalPnl, currency)}
                </div>

                <div className="day-stats">
                  <span><strong>{day.winRate}%</strong> Win Rate</span>
                  <span>{day.wins}W - {day.losses}L ({day.totalTrades} total)</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
                    Avg: {formatCurrency(day.avgPnl, currency)}
                  </span>
                </div>

                {/* Relative Bar visual indicator */}
                <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(100, (Math.abs(day.totalPnl) / maxAbsPnl) * 100)}%`, 
                      height: '100%', 
                      background: day.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)' 
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Asset Edge Comparison & Session Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Asset Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Coins size={20} style={{ color: '#f59e0b' }} />
                Asset Distribution (Gold, BTC, Forex)
              </h2>
              <span className="card-subtitle">Volume and profitability distribution across traded instruments</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assetStats.map(asset => (
              <div 
                key={asset.asset}
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="asset-badge">{asset.asset}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {asset.totalTrades} positions
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Win Rate: <strong>{asset.winRate}%</strong></span>
                    <span style={{ color: 'var(--text-secondary)' }}>Wins: <strong>{asset.wins}</strong></span>
                    <span style={{ color: 'var(--text-secondary)' }}>Losses: <strong>{asset.losses}</strong></span>
                  </div>
                </div>

                <div 
                  style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontWeight: 800, 
                    fontSize: '1.1rem',
                    color: asset.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                  }}
                >
                  {formatCurrency(asset.totalPnl, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Analytics */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Clock size={20} style={{ color: '#818cf8' }} />
                Market Session Performance
              </h2>
              <span className="card-subtitle">London vs New York vs Asian volatility</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(sessionStats).map(([sessionName, data]) => {
              const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0;
              return (
                <div 
                  key={sessionName}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {sessionName} Session
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {data.trades} Trades • {winRate}% Win Rate ({data.wins}W / {data.trades - data.wins}L)
                    </div>
                  </div>

                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 800, 
                      fontSize: '1.1rem',
                      color: data.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                    }}
                  >
                    {formatCurrency(data.pnl, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Psychology & Rules Discipline Leak */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <HeartHandshake size={20} style={{ color: '#ec4899' }} />
              Psychology & Rules Adherence Audit
            </h2>
            <span className="card-subtitle">
              Comparing disciplined rule execution vs emotional trades (FOMO / Revenge)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Rules Followed */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--profit)', fontSize: '0.95rem' }}>
                Followed Strategy Rules
              </span>
              <span className="badge-profit">{rulesFollowedTrades.length} Trades</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--profit)', marginTop: '8px' }}>
              {formatCurrency(followedPnl, currency)}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Whenever you followed your planned setup & risk plan, your account grew steadily.
            </p>
          </div>

          {/* Rules Broken */}
          <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--loss)', fontSize: '0.95rem' }}>
                Broke Rules (FOMO / Revenge)
              </span>
              <span className="badge-loss">{rulesBrokenTrades.length} Trades</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--loss)', marginTop: '8px' }}>
              {formatCurrency(brokenPnl, currency)}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cost of indiscipline: You leaked {formatCurrency(Math.abs(brokenPnl), currency)} due to early entries or chasing candles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
