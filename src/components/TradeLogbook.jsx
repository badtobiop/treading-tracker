import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Plus, 
  Download, 
  ArrowUpDown,
  CheckCircle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function TradeLogbook({ 
  trades, 
  currency, 
  onDeleteTrade, 
  onOpenLogModal 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTrade, setSelectedTrade] = useState(null);

  // Filter trades
  const filteredTrades = trades.filter(t => {
    // Search
    const searchMatch = !searchTerm || 
      (t.asset && t.asset.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.strategy && t.strategy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Asset
    const assetMatch = assetFilter === 'ALL' || t.asset === assetFilter;

    // Type
    const typeMatch = typeFilter === 'ALL' || t.type === typeFilter;

    // Status
    const pnl = Number(t.pnl) || 0;
    const statusMatch = statusFilter === 'ALL' || 
      (statusFilter === 'WIN' && pnl > 0) ||
      (statusFilter === 'LOSS' && pnl < 0);

    return searchMatch && assetMatch && typeMatch && statusMatch;
  });

  // Sort descending by date/time
  const sortedTrades = [...filteredTrades].sort((a, b) => 
    new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`)
  );

  return (
    <div className="view-container">
      {/* Controls Bar */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by asset, strategy, or notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select 
              className="form-select" 
              value={assetFilter} 
              onChange={e => setAssetFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Assets</option>
              <option value="XAUUSD">Gold (XAUUSD)</option>
              <option value="BTCUSD">Bitcoin (BTCUSD)</option>
              <option value="EURUSD">EUR/USD</option>
              <option value="GBPUSD">GBP/USD</option>
              <option value="US30">US30</option>
              <option value="NAS100">NAS100</option>
            </select>

            <select 
              className="form-select" 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Types</option>
              <option value="BUY">BUY (Long)</option>
              <option value="SELL">SELL (Short)</option>
            </select>

            <select 
              className="form-select" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Outcomes</option>
              <option value="WIN">Profits (Wins)</option>
              <option value="LOSS">Losses</option>
            </select>

            <button className="btn btn-primary" onClick={onOpenLogModal}>
              <Plus size={16} />
              <span>Log Trade</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Trade Journal Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              Execution Logbook
            </h2>
            <span className="card-subtitle">
              Showing {sortedTrades.length} of {trades.length} recorded market trades
            </span>
          </div>
        </div>

        <div className="table-container">
          <table className="trade-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Asset</th>
                <th>Type</th>
                <th>Entry / Exit</th>
                <th>SL / TP</th>
                <th>R:R</th>
                <th>Lot / Capital %</th>
                <th>Strategy</th>
                <th>Rules</th>
                <th style={{ textAlign: 'right' }}>Net P&L</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No trades match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedTrades.map(trade => {
                  const pnl = Number(trade.pnl) || 0;
                  const isWin = pnl >= 0;

                  return (
                    <tr key={trade.id}>
                      {/* Date */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trade.date}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{trade.time || '--:--'}</div>
                      </td>

                      {/* Asset */}
                      <td>
                        <span className="asset-badge">{trade.asset}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{trade.session || 'NY'}</div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`trade-type-pill ${trade.type.toLowerCase()}`}>
                          {trade.type}
                        </span>
                      </td>

                      {/* Entry & Exit */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                        <div>{trade.entryPrice}</div>
                        <div style={{ color: 'var(--text-muted)' }}>→ {trade.exitPrice}</div>
                      </td>

                      {/* SL & TP */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        <div style={{ color: 'var(--loss)' }}>SL: {trade.stopLoss || 'N/A'}</div>
                        <div style={{ color: 'var(--profit)' }}>TP: {trade.takeProfit || 'N/A'}</div>
                      </td>

                      {/* Risk:Reward */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {trade.riskRewardRatio || '2.0:1'}
                      </td>

                      {/* Lot & Capital Risk % */}
                      <td style={{ fontSize: '0.8rem' }}>
                        <div>{trade.lotSize || 1.0} Lots</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          {trade.capitalRiskedPercent ? `${trade.capitalRiskedPercent}% risk` : '1.0% risk'}
                        </div>
                      </td>

                      {/* Strategy */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {trade.strategy || 'Discretionary'}
                        </span>
                      </td>

                      {/* Rules & Emotion */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {trade.rulesFollowed ? (
                            <CheckCircle size={14} className="text-profit" title="Followed Rules" />
                          ) : (
                            <XCircle size={14} className="text-loss" title="Broke Rules" />
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {trade.emotion || 'Disciplined'}
                          </span>
                        </div>
                      </td>

                      {/* P&L */}
                      <td style={{ textAlign: 'right' }}>
                        <div 
                          style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: 800, 
                            fontSize: '0.98rem',
                            color: isWin ? 'var(--profit)' : 'var(--loss)'
                          }}
                        >
                          {formatCurrency(pnl, currency)}
                        </div>
                        {trade.pnlPercent && (
                          <div style={{ fontSize: '0.72rem', color: isWin ? 'var(--profit)' : 'var(--loss)' }}>
                            {trade.pnlPercent > 0 ? '+' : ''}{trade.pnlPercent}%
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button 
                            className="btn-icon" 
                            style={{ width: '28px', height: '28px' }}
                            onClick={() => setSelectedTrade(trade)}
                            title="Inspect details"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ width: '28px', height: '28px', color: 'var(--loss)' }}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this trade?')) {
                                onDeleteTrade(trade.id);
                              }
                            }}
                            title="Delete trade"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="modal-overlay" onClick={() => setSelectedTrade(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="asset-badge" style={{ fontSize: '1.2rem' }}>{selectedTrade.asset}</span>
                <span className={`trade-type-pill ${selectedTrade.type.toLowerCase()}`}>
                  {selectedTrade.type}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedTrade.date} at {selectedTrade.time || '12:00'}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setSelectedTrade(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Net Realized P&L</span>
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '1.6rem', 
                      fontWeight: 800,
                      color: selectedTrade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                    }}
                  >
                    {formatCurrency(selectedTrade.pnl, currency)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Risk : Reward</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700 }}>
                    {selectedTrade.riskRewardRatio || '2.0:1'}
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entry Price</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedTrade.entryPrice}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Exit Price</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedTrade.exitPrice}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stop Loss</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--loss)' }}>{selectedTrade.stopLoss || 'N/A'}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Take Profit</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--profit)' }}>{selectedTrade.takeProfit || 'N/A'}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lot Size</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedTrade.lotSize || 1.0}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Capital Risked %</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedTrade.capitalRiskedPercent || 1.0}%</div>
                </div>
              </div>

              {selectedTrade.notes && (
                <div className="card" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trade Rationale & Notes</span>
                  <p style={{ marginTop: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {selectedTrade.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTrade(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
