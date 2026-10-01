import React, { useState } from 'react';
import { Target, Award, Plus, TrendingUp, TrendingDown, Percent, Layers } from 'lucide-react';
import { calculateStrategyStats, formatCurrency } from '../utils/calculations';

export default function StrategyVault({ trades, currency }) {
  const [customStrategyName, setCustomStrategyName] = useState('');
  const [strategiesList, setStrategiesList] = useState([]);

  const stats = calculateStrategyStats(trades);

  // Best strategy by PnL
  const topStrategy = stats.length > 0 ? stats[0] : null;

  return (
    <div className="view-container">
      {/* Strategy Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.3rem' }}>
              <Target size={22} style={{ color: 'var(--accent-cyan)' }} />
              Strategy Performance Vault
            </h2>
            <span className="card-subtitle">
              Compare your setups to discover which strategy is your true money-maker
            </span>
          </div>

          {topStrategy && (
            <div className="badge-profit" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} />
              <span>Highest Yield Setup: <strong>{topStrategy.strategy}</strong> ({formatCurrency(topStrategy.totalPnl, currency)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Strategies Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {stats.map((s, idx) => {
          const isWinner = s.totalPnl >= 0;
          return (
            <div key={s.strategy} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Strategy #{idx + 1}</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {s.strategy}
                  </h3>
                </div>
                <span className={isWinner ? 'badge-profit' : 'badge-loss'}>
                  {s.winRate}% Win Rate
                </span>
              </div>

              {/* P&L & Profit Factor */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Realized P&L</span>
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '1.35rem', 
                      fontWeight: 800,
                      color: isWinner ? 'var(--profit)' : 'var(--loss)'
                    }}
                  >
                    {formatCurrency(s.totalPnl, currency)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Profit Factor</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {s.profitFactor}
                  </div>
                </div>
              </div>

              {/* Detailed metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.78rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Positions</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.totalTrades}</span>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Wins</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--profit)' }}>{s.wins}</span>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Losses</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--loss)' }}>{s.losses}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
