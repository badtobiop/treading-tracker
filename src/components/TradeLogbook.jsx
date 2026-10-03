import React, { useState } from 'react';
import confetti from 'canvas-confetti';
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
  FileSpreadsheet,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import MistakeNoteModal from './MistakeNoteModal';

export default function TradeLogbook({ 
  trades, 
  currency, 
  onDeleteTrade, 
  onOpenLogModal,
  onUpdateTrade
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [tradeToClose, setTradeToClose] = useState(null);
  const [customExitPrice, setCustomExitPrice] = useState('');
  const [tradeToEditMistake, setTradeToEditMistake] = useState(null);

  // Lock background scroll and pause Lenis when any modal is open
  useEffect(() => {
    if (selectedTrade || tradeToClose || tradeToEditMistake) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.__lenis?.stop();
      return () => {
        document.body.style.overflow = origOverflow;
        window.__lenis?.start();
      };
    }
  }, [selectedTrade, tradeToClose, tradeToEditMistake]);

  // Handle Settle / Close Open Trade (TP Hit vs SL Hit vs Breakeven vs Custom Exit)
  const handleSettleTrade = (trade, outcomeType, overrideExit = null) => {
    if (!trade) return;
    const entry = parseFloat(trade.entryPrice) || 0;
    const sl = parseFloat(trade.stopLoss) || 0;
    const tp = parseFloat(trade.takeProfit) || 0;
    const qty = parseFloat(trade.lotSize) || 1.0;
    const isBuy = trade.type === 'BUY';

    let exit = 0;
    let pnl = 0;
    let finalOutcome = outcomeType;

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
    } else if (outcomeType === 'CUSTOM') {
      exit = parseFloat(overrideExit !== null ? overrideExit : customExitPrice) || entry;
      const points = isBuy ? (exit - entry) : (entry - exit);
      pnl = parseFloat((qty * points).toFixed(2));
      if (pnl > 0) finalOutcome = 'TP_HIT';
      else if (pnl < 0) finalOutcome = 'SL_HIT';
      else finalOutcome = 'BREAKEVEN';
    }

    const updatedTrade = {
      ...trade,
      exitPrice: exit,
      outcome: finalOutcome,
      pnl: pnl,
      closedAt: new Date().toISOString()
    };

    if (onUpdateTrade) {
      onUpdateTrade(updatedTrade);
    }

    if (pnl > 0 || finalOutcome === 'TP_HIT') {
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.8 } });
    }

    setTradeToClose(null);
    setSelectedTrade(null);
    setCustomExitPrice('');

    // ONLY if Stop Loss was strictly hit, prompt trader to log their mistake (NEVER on TP Hit)
    if (finalOutcome === 'SL_HIT' && pnl < 0) {
      setTimeout(() => {
        setTradeToEditMistake(updatedTrade);
      }, 300);
    }
  };

  // Outcome statistics for Monthly Progress
  const tpHitCount = trades.filter(t => t.outcome === 'TP_HIT' || (Number(t.pnl) > 0 && !t.outcome)).length;
  const slHitCount = trades.filter(t => t.outcome === 'SL_HIT' || (Number(t.pnl) < 0 && !t.outcome)).length;
  const breakevenCount = trades.filter(t => t.outcome === 'BREAKEVEN').length;
  const openCount = trades.filter(t => t.outcome === 'OPEN').length;
  const totalDecided = tpHitCount + slHitCount;
  const targetHitRate = totalDecided > 0 ? ((tpHitCount / totalDecided) * 100).toFixed(1) : 0;

  // Filter trades
  const filteredTrades = trades.filter(t => {
    // Search
    const searchMatch = !searchTerm || 
      (t.asset && t.asset.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.strategy && t.strategy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.mistakeNote && t.mistakeNote.toLowerCase().includes(searchTerm.toLowerCase()));

    // Asset
    const assetMatch = assetFilter === 'ALL' || t.asset === assetFilter;

    // Type
    const typeMatch = typeFilter === 'ALL' || t.type === typeFilter;

    // Status / Outcome
    const pnl = Number(t.pnl) || 0;
    const statusMatch = statusFilter === 'ALL' || 
      (statusFilter === 'TP_HIT' && (t.outcome === 'TP_HIT' || (pnl > 0 && !t.outcome))) ||
      (statusFilter === 'SL_HIT' && (t.outcome === 'SL_HIT' || (pnl < 0 && !t.outcome))) ||
      (statusFilter === 'WIN' && pnl > 0) ||
      (statusFilter === 'LOSS' && pnl < 0) ||
      (statusFilter === 'MISTAKES' && !!t.mistakeNote) ||
      (statusFilter === 'UNREVIEWED_LOSS' && (pnl < 0 || t.outcome === 'SL_HIT') && !t.mistakeNote);

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
              <option value="TP_HIT">🎯 TP Hit Trades ({tpHitCount})</option>
              <option value="SL_HIT">🛑 SL Hit Trades ({slHitCount})</option>
              <option value="WIN">Profits (Wins)</option>
              <option value="LOSS">Losses</option>
              <option value="MISTAKES">⚠️ With Mistake Notes ({trades.filter(t => t.mistakeNote).length})</option>
              <option value="UNREVIEWED_LOSS">🚨 Unreviewed Losses ({trades.filter(t => (Number(t.pnl) < 0 || t.outcome === 'SL_HIT') && !t.mistakeNote).length})</option>
            </select>

            <button className="btn btn-primary" onClick={onOpenLogModal}>
              <Plus size={16} />
              <span>Log Trade</span>
            </button>
          </div>
        </div>

        {/* Monthly Progress / Target vs Stop Loss Hit Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Outcome Progress:</span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--profit)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
              🎯 {tpHitCount} TP Hit
            </span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--loss)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
              🛑 {slHitCount} SL Hit
            </span>
            {breakevenCount > 0 && (
              <span style={{ fontSize: '0.82rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '12px' }}>
                ⚖️ {breakevenCount} Breakeven
              </span>
            )}
            {openCount > 0 && (
              <span style={{ fontSize: '0.82rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '4px 10px', borderRadius: '12px' }}>
                ⏳ {openCount} Open
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--text-muted)' }}>Target Hit Rate: </span>
            <span style={{ color: Number(targetHitRate) >= 50 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
              {targetHitRate}%
            </span>
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
                          {trade.outcome === 'OPEN' ? (
                            <span style={{ color: 'var(--accent-cyan)' }}>Running</span>
                          ) : (
                            formatCurrency(pnl, currency)
                          )}
                        </div>
                        {trade.outcome === 'TP_HIT' && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--profit)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                            🎯 TP HIT
                          </span>
                        )}
                        {trade.outcome === 'SL_HIT' && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--loss)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                            🛑 SL HIT
                          </span>
                        )}
                        {trade.outcome === 'BREAKEVEN' && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                            ⚖️ BREAKEVEN
                          </span>
                        )}
                        {trade.outcome === 'OPEN' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-block' }}>
                              ⏳ OPEN
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTradeToClose(trade);
                              }}
                              style={{
                                fontSize: '0.68rem',
                                padding: '3px 8px',
                                background: 'rgba(56, 189, 248, 0.2)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.45)',
                                borderRadius: '4px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title="Trade khatam ho gayi? TP ya SL record karein!"
                            >
                              ⚡ Settle / Close
                            </button>
                          </div>
                        )}
                        {trade.pnlPercent && trade.outcome !== 'OPEN' && (
                          <div style={{ fontSize: '0.72rem', color: isWin ? 'var(--profit)' : 'var(--loss)' }}>
                            {trade.pnlPercent > 0 ? '+' : ''}{trade.pnlPercent}%
                          </div>
                        )}

                        {/* Mistake Note Tag / Galti Likho Button */}
                        {trade.mistakeNote ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setTradeToEditMistake(trade);
                            }}
                            style={{
                              marginTop: '4px',
                              padding: '3px 8px',
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1px solid rgba(244, 63, 94, 0.35)',
                              borderRadius: '6px',
                              color: '#fca5a5',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              maxWidth: '180px',
                              textAlign: 'left'
                            }}
                            title={`Galti / Mistake: "${trade.mistakeNote}" (Click to view/edit)`}
                          >
                            <span style={{ flexShrink: 0 }}>⚠️</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {trade.mistakeNote}
                            </span>
                          </div>
                        ) : (
                          // ONLY show Galti Likho on SL_HIT or loss trades, NEVER on TP_HIT or OPEN trades!
                          (trade.outcome === 'SL_HIT' || Number(trade.pnl) < 0) && trade.outcome !== 'OPEN' && trade.outcome !== 'TP_HIT' && (
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTradeToEditMistake(trade);
                                }}
                                style={{
                                  marginTop: '4px',
                                  padding: '2px 8px',
                                  background: 'rgba(244, 63, 94, 0.14)',
                                  border: '1px dashed rgba(244, 63, 94, 0.5)',
                                  borderRadius: '5px',
                                  color: '#fda4af',
                                  fontSize: '0.70rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Click karein aur likhein ki is trade me kya galti hui jisse SL hit hua"
                              >
                                <span>⚠️</span> + Galti Likho
                              </button>
                            </div>
                          )
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {trade.outcome === 'OPEN' && (
                            <button 
                              className="btn-icon" 
                              style={{ width: '28px', height: '28px', color: 'var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.15)' }}
                              onClick={() => setTradeToClose(trade)}
                              title="Settle Open Trade (TP Hit vs SL Hit)"
                            >
                              <Zap size={14} />
                            </button>
                          )}
                          {/* Only show warning icon for Loss/SL trades or if note already exists, NEVER on TP_HIT! */}
                          {((trade.outcome === 'SL_HIT' || Number(trade.pnl) < 0) && trade.outcome !== 'TP_HIT' || !!trade.mistakeNote) && (
                            <button 
                              className="btn-icon" 
                              style={{ 
                                width: '28px', 
                                height: '28px',
                                color: trade.mistakeNote ? '#fda4af' : '#fb7185',
                                background: trade.mistakeNote ? 'rgba(244, 63, 94, 0.18)' : 'rgba(244, 63, 94, 0.08)'
                              }}
                              onClick={() => setTradeToEditMistake(trade)}
                              title={trade.mistakeNote ? "Edit Mistake / Post-Mortem Note" : "SL kyu hit hua? Galti note karein"}
                            >
                              <AlertTriangle size={14} />
                            </button>
                          )}
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
        <div className="modal-overlay" data-lenis-prevent="true" onClick={() => setSelectedTrade(null)}>
          <div className="modal-content" data-lenis-prevent="true" onClick={e => e.stopPropagation()}>
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

            <div className="modal-body" data-lenis-prevent="true" style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {/* If Open Trade: Show Quick Settle Panel right at top of detail modal */}
              {selectedTrade.outcome === 'OPEN' && (
                <div style={{ background: 'linear-gradient(135deg, rgba(20, 25, 45, 0.95), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚡</span>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#fff' }}>Ye Position Market Me OPEN Hai</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Market me trade khatam ho gayi? Niche se 1-click me result record karein:</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      ⏳ Status: Active / Open
                    </span>
                  </div>

                  {/* 3 Outcome Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                    {/* TP Hit */}
                    <button
                      type="button"
                      onClick={() => handleSettleTrade(selectedTrade, 'TP_HIT')}
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1.5px solid var(--profit)',
                        borderRadius: '10px',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '1.3rem' }}>🎯</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--profit)' }}>TP Hit Hua!</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--profit)', fontWeight: 700 }}>
                        Target: {selectedTrade.takeProfit || 'TP'}
                      </span>
                    </button>

                    {/* SL Hit */}
                    <button
                      type="button"
                      onClick={() => handleSettleTrade(selectedTrade, 'SL_HIT')}
                      style={{
                        background: 'rgba(244, 63, 94, 0.15)',
                        border: '1.5px solid var(--loss)',
                        borderRadius: '10px',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '1.3rem' }}>🛑</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--loss)' }}>SL Hit Hua!</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--loss)', fontWeight: 700 }}>
                        Stop Loss: {selectedTrade.stopLoss || 'SL'}
                      </span>
                    </button>

                    {/* Breakeven */}
                    <button
                      type="button"
                      onClick={() => handleSettleTrade(selectedTrade, 'BREAKEVEN')}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '1.3rem' }}>⚖️</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Breakeven</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Exit: {selectedTrade.entryPrice} (₹0)
                      </span>
                    </button>
                  </div>

                  {/* Custom Exit Price */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input"
                      placeholder="Ya custom exit price daalein (e.g. 4190)"
                      value={customExitPrice}
                      onChange={e => setCustomExitPrice(e.target.value)}
                      style={{ padding: '7px 12px', fontSize: '0.84rem', flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '7px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 600 }}
                      onClick={() => {
                        if (!customExitPrice) {
                          alert('Kripya exit price daalein!');
                          return;
                        }
                        handleSettleTrade(selectedTrade, 'CUSTOM', customExitPrice);
                      }}
                    >
                      Custom Close
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Net Realized P&L</span>
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '1.6rem', 
                      fontWeight: 800,
                      color: selectedTrade.outcome === 'OPEN' ? 'var(--accent-cyan)' : selectedTrade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                    }}
                  >
                    {selectedTrade.outcome === 'OPEN' ? 'OPEN POSITION' : formatCurrency(selectedTrade.pnl, currency)}
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
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedTrade.outcome === 'OPEN' ? 'Still Running...' : selectedTrade.exitPrice}</div>
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

              {/* Mistake & Post-Mortem Card */}
              {selectedTrade.mistakeNote ? (
                <div className="card" style={{ padding: '14px', border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#fda4af', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} /> Trade Mistake & Post-Mortem Note
                    </span>
                    <button 
                      type="button" 
                      onClick={() => { setTradeToEditMistake(selectedTrade); }}
                      style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Edit Note
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#fecaca', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {selectedTrade.mistakeNote}
                  </p>
                  {selectedTrade.lessonLearned && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(244, 63, 94, 0.25)', fontSize: '0.8rem', color: '#93c5fd' }}>
                      💡 <strong>Future Rule:</strong> {selectedTrade.lessonLearned}
                    </div>
                  )}
                </div>
              ) : (
                (Number(selectedTrade.pnl) < 0 || selectedTrade.outcome === 'SL_HIT') && selectedTrade.outcome !== 'OPEN' && selectedTrade.outcome !== 'TP_HIT' && (
                  <div className="card" style={{ padding: '12px 14px', border: '1px dashed rgba(244, 63, 94, 0.35)', background: 'rgba(244, 63, 94, 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      🛑 <strong>SL Hit Hua Tha:</strong> Apni galti note karein taaki future me repeat na ho.
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.76rem', padding: '4px 10px', color: '#fda4af', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                      onClick={() => setTradeToEditMistake(selectedTrade)}
                    >
                      ⚠️ + Galti Likho
                    </button>
                  </div>
                )
              )}

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

      {/* Settle Open Trade Quick Modal */}
      {tradeToClose && (
        <div className="modal-overlay" data-lenis-prevent="true" onClick={() => setTradeToClose(null)}>
          <div className="modal-content" data-lenis-prevent="true" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
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
              <button className="btn-icon" onClick={() => setTradeToClose(null)}>✕</button>
            </div>

            <div className="modal-body" data-lenis-prevent="true" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: 'calc(85vh - 120px)', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Ye trade market me complete ho gayi? Niche diye gaye option me se chunein ki <strong>TP Hit hua ya SL Hit</strong>:
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
                        TP Hit Hua! (Target Achieved)
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
                        SL Hit Hua! (Stop Loss Triggered)
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
              </div>

              {/* 4. Custom Exit Price */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Ya koi aur exit price par close kiya?
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
                        alert('Kripya exit price daalein!');
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
              <button className="btn btn-secondary" onClick={() => setTradeToClose(null)}>
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
          if (selectedTrade && selectedTrade.id === updated.id) {
            setSelectedTrade(updated);
          }
        }}
        currency={currency}
      />
    </div>
  );
}
