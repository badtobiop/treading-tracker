import React from 'react';
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
  Sparkles
} from 'lucide-react';
import { formatCurrency, calculateDayOfWeekStats, calculateAssetStats } from '../utils/calculations';

export default function Dashboard({ 
  trades, 
  metrics, 
  currency, 
  onNavigate, 
  onOpenLogModal 
}) {
  const dayStats = calculateDayOfWeekStats(trades);
  const assetStats = calculateAssetStats(trades);

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
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{trade.time || '--:--'}</div>
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
                            color: trade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                          }}
                        >
                          {formatCurrency(trade.pnl, currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
